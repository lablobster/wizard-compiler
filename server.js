const express = require("express");
const solc = require("solc");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

const findImports = (importPath) => {
  try {
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

app.post("/compile", async (req, res) => {
  try {
    const { code, address } = req.body;
    const input = {
      language: "Solidity",
      sources: {
        "Contract.sol": {
          content: code,
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
    const contractName = Object.keys(contractFile)[0];
    const compiledContract = contractFile[contractName];

    const abi = compiledContract.abi;
    const bytecode = compiledContract.evm.bytecode.object;

    const constructor = abi.find((item) => item.type === "constructor");
    let deployData;
    let constructorArgs;
    if (constructor && constructor.inputs.length > 0) {
      constructorArgs = constructor.inputs.map(() => address);
      const factory = new ethers.ContractFactory(abi, bytecode);
      const deployTransaction = await factory.getDeployTransaction(
        ...constructorArgs
      );
      console.log(constructorArgs);
      deployData = deployTransaction.data;
    } else {
      deployData = `0x${bytecode}`;
    }

    res.json({ abi, deployData, constructorArgs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ERROR" });
  }
});

app.listen(port, () => {
  console.log(`Running on port ${port}`);
});
