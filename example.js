const { GenesisBlock } = require("./index");

try {
  const genesisBlock = new GenesisBlock();
  genesisBlock.addTransfer({
    recipientId: "1140387148230104378L",
    amount: "10000000000",
  });
  genesisBlock.addTransfer({
    recipientId: "18092005366853123659L",
    amount: "10000090000",
  });
  genesisBlock.addDelegate({
    username: "genesis_0",
    passphrase:
      "trigger oblige mom orchard please knife slow mixed afraid until suspect setup"
  });
  genesisBlock.addDelegate({
    username: "genesis_1"
  });
  genesisBlock.addVote(
    "rich grief clog quote buzz swing interest delay demand today skill verify",
    ["genesis_0"]
  );
  genesisBlock.addVote(
    "same swamp fade drink radio fancy matter error picnic dial tone cinnamon",
    ["genesis_1", "genesis_0"]
  );

  genesisBlock.saveGenesisBlock("./example");
} catch (e) {
  console.log(e);
}
