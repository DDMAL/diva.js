import {defineConfig} from "@playwright/test";

export default defineConfig({
    testDir : "./browser-tests",
    projects : [
        {name : "osd-5.0.1", metadata : {osdVersion : "5.0.1"}},
        {name : "osd-6.0.2", metadata : {osdVersion : "6.0.2"}}
    ],
    use : {baseURL : "http://127.0.0.1:4173"},
    webServer : {
        command : "python3 -m http.server 4173 --bind 127.0.0.1",
        port : 4173,
        reuseExistingServer : true
    }
});
