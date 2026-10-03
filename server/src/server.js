import app from "./app.js";

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
    console.log(`Serwer działa na http://localhost:${port}`);
});