const { GenesisBlock } = require("./index");
const fs = require("fs");
jest.spyOn(global.console, "log").mockImplementation(() => jest.fn());

test("Construct class creates genesis account", () => {
  const genesisBlock = new GenesisBlock();
  expect(genesisBlock._getGenesisAccount().passphrase).toBeDefined();
  expect(genesisBlock._getGenesisAccount().publicKey).toBeDefined();
  expect(genesisBlock._getGenesisAccount().privateKey).toBeDefined();
});

test("Construct class with specific genesis account", () => {
  const genesisBlock = new GenesisBlock(
    "trigger oblige mom orchard please knife slow mixed afraid until suspect setup"
  );
  expect(genesisBlock._getGenesisAccount().passphrase).toBe(
    "trigger oblige mom orchard please knife slow mixed afraid until suspect setup"
  );
  expect(genesisBlock._getGenesisAccount().publicKey).toBe(
    "de4f6165687e9ab809565bd98a87adccfd78381b3732c95072fbdad2fd5c549b"
  );
  expect(genesisBlock._getGenesisAccount().privateKey).toBe(
    "d1580b6b13b0fc69da5ed964f028b4d7f83076803f760335c82d11a7987070d9de4f6165687e9ab809565bd98a87adccfd78381b3732c95072fbdad2fd5c549b"
  );
});

test("Throw construct with invalid passphrase", () => {
  expect(() => {
    const genesisBlock = new GenesisBlock("trigger");
  }).toThrow();
});

const genesisBlock = new GenesisBlock(
  "trigger oblige mom orchard please knife slow mixed afraid until suspect setup"
);
test("throw addTransfer with null amount", () => {
  expect(() => {
    genesisBlock.addTransfer({ recipientId: "12345L", amount: null });
  }).toThrow();
});

test("throw addTransfer with null recipientId", () => {
  expect(() => {
    genesisBlock.addTransfer({ recipientId: null, amount: "123124" });
  }).toThrow();
});

// test("throw addTransfer with integer amount", () => {
//   expect(() => {
//     genesisBlock.addTransfer({ recipientId: "12345L", amount: 123124 });
//   }).toThrow();
// });

test("Add valid transfer", () => {
  genesisBlock.addTransfer({
    recipientId: "18254294583320434366L",
    amount: "10000000000"
  });
  expect(genesisBlock.transactions[0].amount.toString()).toBe("10000000000");
  expect(genesisBlock.transactions[0]).toHaveProperty(
    "recipientId",
    "18254294583320434366L"
  );
  expect(genesisBlock.transactions[0]).toHaveProperty(
    "senderPublicKey",
    "de4f6165687e9ab809565bd98a87adccfd78381b3732c95072fbdad2fd5c549b"
  );
  expect(genesisBlock.transactions[0]).toHaveProperty("timestamp", 0);
  expect(genesisBlock.transactions[0]).toHaveProperty("type", 0);
  expect(genesisBlock.transactions[0]).toHaveProperty("fee", "0");
  expect(genesisBlock.transactions[0].recipientPublicKey).not.toBeDefined();
  expect(genesisBlock.transactions[0]).toHaveProperty(
    "asset",
    expect.any(Object)
  );
  expect(genesisBlock.transactions[0]).toHaveProperty("id", expect.any(String));
  expect(genesisBlock.transactions[0]).toHaveProperty(
    "signature",
    expect.any(String)
  );
});

test("Add genesis delegate", () => {
  genesisBlock.addDelegate({
    username: "genesis_0"
  });
  expect(genesisBlock.delegates.length).toBe(1);
  expect(genesisBlock.delegates[0]).toHaveProperty("passphrase");
  expect(genesisBlock.delegates[0]).toHaveProperty("username", "genesis_0");
});

test("Add passphrased delegate", () => {
  genesisBlock.addDelegate({
    username: "genesis_1",
    passphrase:
      "rich grief clog quote buzz swing interest delay demand today skill verify"
  });
  expect(genesisBlock.transactions[2]).toHaveProperty("type", 2);
  expect(genesisBlock.transactions[2].amount.toString()).toBe("0");
  expect(genesisBlock.transactions[2]).toHaveProperty("timestamp", 0);
  expect(genesisBlock.transactions[2]).toHaveProperty("fee", "0");
  expect(genesisBlock.transactions[2].asset).toHaveProperty("delegate", {
    username: "genesis_1"
  });
  expect(genesisBlock.transactions[2]).toHaveProperty(
    "senderPublicKey",
    "b40a0e099a538df434573e1cd1e07c0e3449de33f3defc624e687b9fa5568227"
  );
});

test("Can't add duplicate delegate name", () => {
  expect(() => {
    genesisBlock.addDelegate({
      username: "genesis_0"
    });
  }).toThrow();
});

test("Can't add without delegate name", () => {
  expect(() => {
    genesisBlock.addDelegate();
  }).toThrow();
});

test("Add valid vote", () => {
  genesisBlock.addVote(
    "rich grief clog quote buzz swing interest delay demand today skill verify",
    ["genesis_1"]
  );
  expect(genesisBlock.transactions[3].amount.toString()).toBe("0");
  expect(genesisBlock.transactions[3]).toHaveProperty(
    "recipientId",
    "18092005366853123659L"
  );
  expect(genesisBlock.transactions[3]).toHaveProperty(
    "senderPublicKey",
    "b40a0e099a538df434573e1cd1e07c0e3449de33f3defc624e687b9fa5568227"
  );
  expect(genesisBlock.transactions[3]).toHaveProperty("timestamp", 0);
  expect(genesisBlock.transactions[3]).toHaveProperty("type", 3);
  expect(genesisBlock.transactions[3]).toHaveProperty("fee", "0");
  expect(genesisBlock.transactions[3].recipientPublicKey).not.toBeDefined();
  expect(genesisBlock.transactions[3].asset).toHaveProperty("votes", [
    "+b40a0e099a538df434573e1cd1e07c0e3449de33f3defc624e687b9fa5568227"
  ]);
  expect(genesisBlock.transactions[3]).toHaveProperty("id", expect.any(String));
  expect(genesisBlock.transactions[3]).toHaveProperty(
    "signature",
    expect.any(String)
  );
});

test("No passphrase vote throws", () => {
  expect(() => {
    genesisBlock.addVote("", ["genesis_1"]);
  }).toThrow();
});

test("Non existing delegate vote throws", () => {
  expect(() => {
    genesisBlock.addVote(
      "rich grief clog quote buzz swing interest delay demand today skill verify",
      ["genesis_2"]
    );
  }).toThrow();
});

test("Delegate vote string throws", () => {
  expect(() => {
    genesisBlock.addVote(
      "rich grief clog quote buzz swing interest delay demand today skill verify",
      "genesis_1"
    );
  }).toThrow();
});

test("Block creation is valid", () => {
  genesisBlock._createGenesisBlock();
  expect(genesisBlock.genesisBlock).toHaveProperty("version", 0);
  expect(genesisBlock.genesisBlock).toHaveProperty(
    "totalAmount",
    "10000000000"
  );
  expect(genesisBlock.genesisBlock).toHaveProperty("totalFee", "0");
  expect(genesisBlock.genesisBlock).toHaveProperty("reward", "0");
  expect(genesisBlock.genesisBlock).toHaveProperty(
    "payloadHash",
    expect.any(String)
  );
  expect(genesisBlock.genesisBlock).toHaveProperty("timestamp", 0);
  expect(genesisBlock.genesisBlock).toHaveProperty("numberOfTransactions", 4);
  expect(genesisBlock.genesisBlock).toHaveProperty("payloadLength", 551);
  expect(genesisBlock.genesisBlock).toHaveProperty("previousBlock", null);
  expect(genesisBlock.genesisBlock).toHaveProperty(
    "generatorPublicKey",
    "de4f6165687e9ab809565bd98a87adccfd78381b3732c95072fbdad2fd5c549b"
  );
  expect(genesisBlock.genesisBlock).toHaveProperty(
    "transactions",
    expect.any(Array)
  );
  expect(genesisBlock.genesisBlock.transactions.length).toBe(4);
  expect(genesisBlock.genesisBlock).toHaveProperty("height", 1);
  expect(genesisBlock.genesisBlock).toHaveProperty(
    "blockSignature",
    expect.any(String)
  );
  expect(genesisBlock.genesisBlock).toHaveProperty("id", expect.any(String));
});

test("Save block works", () => {
  if (fs.existsSync("./test")) {
    emptyTestDir();
  }
  genesisBlock.saveGenesisBlock("./test", true, false);
  expect(fs.existsSync("./test")).toBe(true);
  expect(fs.existsSync("./test/private")).toBe(true);
  expect(fs.existsSync("./test/genesis_block.json")).toBe(true);
  expect(fs.existsSync("./test/private/genesis_account.json")).toBe(true);
  expect(fs.existsSync("./test/private/genesis_delegates.json")).toBe(true);
  if (fs.existsSync("./test")) {
    emptyTestDir();
  }
});

function emptyTestDir() {
  if (fs.existsSync("./test")) {
    fs.unlinkSync("./test/private/genesis_delegates.json");
    fs.unlinkSync("./test/private/genesis_account.json");
    fs.unlinkSync("./test/genesis_block.json");
    fs.rmdirSync("./test/private");
    fs.rmdirSync("./test");
  }
}
