async function main() {
    let changeCount = 10;
    await Promise.all([
        new Promise((resolve) => {
            console.log("1");
            changeCount--;
            resolve();
        }),
        new Promise((resolve) => {
            setTimeout(() => {
                console.log("2");
                changeCount--;
                resolve();
            }, 0.001);
        }),
        new Promise((resolve) => {
            console.log("3");
            changeCount--;
            resolve();
        }),
        new Promise((resolve) => {
            console.log("4");
            changeCount--;
            resolve();
        }),
        new Promise((resolve) => {
            console.log("5");
            changeCount--;
            resolve();
        }),
        new Promise((resolve) => {
            console.log("6");
            changeCount--;
            resolve();
        }),
        new Promise((resolve) => {
            console.log("7");
            changeCount--;
            resolve();
        }),
        new Promise((resolve) => {
            console.log("8");
            changeCount--;
            resolve();
        }),
        new Promise((resolve) => {
            console.log("9");
            changeCount--;
            resolve();
        }),
    ]);
    console.log(changeCount);
}

main();
