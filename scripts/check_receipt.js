async function checkReceipt() {
  const response = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ids: ['019eab81-d860-77d3-ac8c-2a103f67a1c3']
    })
  });
  
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

checkReceipt();
