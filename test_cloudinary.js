const fs = require('fs');

async function test() {
    const uploadUrl = `https://api.cloudinary.com/v1_1/do6lyfmn4/raw/upload`;
    
    // Create 12MB buffer
    const buffer = Buffer.alloc(12 * 1024 * 1024, 'a');
    
    const formData = new FormData();
    formData.append('file', new Blob([buffer]), 'large_file.txt');
    formData.append('upload_preset', 'lrkgj8fj');
    
    try {
        const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        console.log("Cloudinary Response:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.log("Fetch Error:", e);
    }
}

test();
