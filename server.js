const express = require("express");
const solc = require("solc");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const app = express();
const port = 3000;

// Allow requests only from a specific domain
// const allowedOrigins = ["https://www.metio.lat", "https://metio.lat/"];

// const corsOptions = {
//   origin: (origin, callback) => {
//     if (!origin || allowedOrigins.includes(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error("Not allowed by CORS"));
//     }
//   },
// };

app.use(express.json());
app.use(cors());
// app.use(cors(corsOptions));

const findImports = (importPath) => {
  try {
    // Adjust the path to use the local @openzeppelin directory in the project root
    const fullPath = path.resolve(__dirname, "./", importPath);
    console.log(`Attempting to read file from path: ${fullPath}`);
    const content = fs.readFileSync(fullPath, "utf8");
    return { contents: content };
  } catch (e) {
    console.error(`File not found: ${importPath}`);
    return { error: "File not found" };
  }
};

app.get("/", (req, res) => res.send("Wizzard Compiler API"));

app.post("/compile", (req, res) => {
  try {
    const input = {
      language: "Solidity",
      sources: {
        "Contract.sol": {
          content: req.body.code,
        },
      },
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
        evmVersion: "paris",
        outputSelection: {
          "*": {
            "*": ["*"],
          },
        },
      },
    };

    const output = JSON.parse(
      solc.compile(JSON.stringify(input), { import: findImports })
    );

    if (output.errors) {
      return res.status(400).json({ errors: output.errors });
    }

    const contractFile = output.contracts["Contract.sol"];
    const compiledContract = contractFile[Object.keys(contractFile)[0]];

    res.json(compiledContract);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ERROR" });
  }
});

app.listen(port, () => {
  console.log(`Running on port ${port}`);
});
