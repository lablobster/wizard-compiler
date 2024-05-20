const express = require("express");
const solc = require("solc");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

const findImports = (importPath) => {
  try {
    const fullPath = path.resolve(__dirname, "node_modules", importPath);
    const content = fs.readFileSync(fullPath, "utf8");
    return { contents: content };
  } catch (e) {
    return { error: "File not found" };
  }
};

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
