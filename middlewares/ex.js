module.exports = {
    name: "ex",
    priority: 10,
    runOn: "all",
    async execute(message) {
        if (message.text && message.text.includes("titantestsat")) {
            console.log("midwale funcionando");
            return false;
        }
        return true;
    }
};
