const payload = {
  to: "ExponentPushToken[rTiGe3DJrFxYWkcUXKwTp8]",
  title: "Test Notification",
  body: "This is a test to see if it shows up when closed!",
  sound: "default",
  priority: "high",
  channelId: "default",
  data: { type: "message" }
};

fetch("https://exp.host/--/api/v2/push/send", {
  method: "POST",
  headers: {
    "Accept": "application/json",
    "Accept-Encoding": "gzip, deflate",
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
})
.then(res => res.json())
.then(data => console.log("Result:", JSON.stringify(data)))
.catch(err => console.error("Error:", err));
