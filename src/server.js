require('dotenv').config();
const app = require('./app');
const { startScheduler } = require('./utils/scheduler');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startScheduler();
});
