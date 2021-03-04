const { Auth } = require("./auth.js");

describe("Authentication test suite", () => {
    const auth = new Auth();

    it("Get token", async () => {
        jest.setTimeout(30000);
        let token = await auth.getToken();
        //console.log(token);
        expect(token.token != null).toEqual(true);
        return;
    });

    it("Test save token", async () => {
        jest.setTimeout(5000);
        let saveResult = await auth.saveToken();
        expect(saveResult == null).toEqual(true);
    });

    it("Test get token", async () => {
        jest.setTimeout(5000);
        let token = await auth.loadSavedToken();
        expect(token.token.expires_in).toEqual(3600);
    });

    it("Refresh token", async () => {
        jest.setTimeout(5000);
        let refresh = await auth.refresh();
        expect(refresh.token != null).toEqual(true);
        return;
    });

    it("Delete saved refresh token", async () => {
        jest.setTimeout(5000);
        let deleteResult = await auth.deleteSavedToken();
        expect(deleteResult).toEqual(true);
    });
});
