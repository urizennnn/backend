const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT;

app.use(cors());

app.get("/api/data", (req, res) => {
  res.json({ message: "Hello from the backend!" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
