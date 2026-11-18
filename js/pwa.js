
if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
        try {
            const registration = await navigator.serviceWorker.register(
                "./service-worker.js"
            );

            console.log(
                "FoodWise service worker registered!",
                registration
            );
        } catch (error) {
            console.error(
                "FoodWise service worker registration failed:",
                error
            );
        }
    });
}
