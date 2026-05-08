import express from './node_modules/express/index.js';
const app = express();
app.use((req, res) => res.send('fallback ok'));
app.listen(3001, () => {
  console.log('TEST PASSED - app.use fallback works');
  process.exit(0);
});
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 3000);
