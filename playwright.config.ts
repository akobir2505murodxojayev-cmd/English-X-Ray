import {defineConfig,devices} from '@playwright/test'
const baseURL='http://127.0.0.1:3030'
export default defineConfig({
 testDir:'tests',testMatch:'**/*.spec.ts',use:{...devices['Pixel 7'],baseURL,trace:'retain-on-failure',launchOptions:process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}},
 webServer:{command:'npm run start -- --port 3030 --hostname 127.0.0.1',url:baseURL+'/api/health',reuseExistingServer:false}
})
