import vm from 'node:vm';
import fs from 'node:fs/promises';

export class ApiError extends Error {
 constructor(message,status,details=[],code=null){super(message);this.status=status;this.details=details;this.code=code;}
}
// Uruchamiamy rzeczywisty kod serwisów, zastępując wyłącznie natywne moduły i sieć.
export async function loadService(name,{apiRequest=async()=>({}),storage=new Map(),write,remove}={}){
 const calls=[];
 const context=vm.createContext({console});
 const modules={
  'expo-crypto':{randomUUID:()=> '00000000-0000-4000-8000-000000000001'},
  'expo-secure-store':{
   getItemAsync:async key=>storage.get(key)??null,
   setItemAsync:async(key,value)=>{if(write)await write(key,value);storage.set(key,value);},
   deleteItemAsync:async key=>{if(remove)await remove(key);storage.delete(key);},
  },
  './api.js':{ApiError,apiRequest:async(path,options)=>{calls.push({path,options});return apiRequest(path,options);}},
 };
 const source=await fs.readFile(new URL(`../../src/services/${name}.js`,import.meta.url),'utf8');
 const module=new vm.SourceTextModule(source,{context});
 await module.link(async specifier=>{
  const exports=modules[specifier];if(!exports)throw new Error(`Unexpected import ${specifier}`);
  return new vm.SyntheticModule(Object.keys(exports),function(){for(const[key,value]of Object.entries(exports))this.setExport(key,value);},{context});
 });
 await module.evaluate();return {service:module.namespace,storage,calls};
}
export async function loadApi({fetch,apiUrl='http://test.invalid',setTimeout=globalThis.setTimeout,clearTimeout=globalThis.clearTimeout}={}){
 const context=vm.createContext({fetch,AbortController,setTimeout,clearTimeout,process:{env:{EXPO_PUBLIC_API_URL:apiUrl}}});
 const source=await fs.readFile(new URL('../../src/services/api.js',import.meta.url),'utf8');
 const module=new vm.SourceTextModule(source,{context});await module.link(()=>{throw new Error('Unexpected import');});await module.evaluate();return module.namespace;
}
