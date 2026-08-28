void import("./dist/src/index.js")
  .then(({ start }) => start())
  .catch((error) => {
    console.error("Bossnet Proceduri API nu a putut porni", error);
    process.exitCode = 1;
  });
