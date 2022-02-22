require('dotenv').config();
import app from 'src/app'
const main = async (): Promise<void> => {
    app.listen(app.get("port"));
    console.log("SERVER "+app.get("port"));
}
main();