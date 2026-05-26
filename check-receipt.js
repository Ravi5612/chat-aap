const payload = {
  ids: ["019e63de-e663-75fb-a135-b19a17bdcd88"]
};

fetch("https://exp.host/--/api/v2/push/getReceipts", {
  method: "POST",
  headers: {
    "Accept": "application/json",
    "Accept-Encoding": "gzip, deflate",
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
})
.then(res => res.json())
.then(data => console.log("Receipts:", JSON.stringify(data, null, 2)))
.catch(err => console.error("Error:", err));
