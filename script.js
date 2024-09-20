let railData = [];
let curtainData = [];
let sheerCurtainData = [];

async function loadData() {
    try {
        const response = await fetch('priceData.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        railData = data.railData;
        curtainData = data.curtainData;
        sheerCurtainData = data.sheerCurtainData;
        console.log('Data loaded:', { railData, curtainData, sheerCurtainData });
        initializeSelects();
    } catch (error) {
        console.error('Error loading data:', error);
        alert('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    }
}

function initializeSelects() {
    loadRailTypes();
    loadCurtainTypes();
    loadSheerCurtainTypes();
}

function loadRailTypes() {
    const railTypeSelect = document.getElementById('railType');
    const uniqueRailTypes = [...new Set(railData.map(item => item.railType))];
    railTypeSelect.innerHTML = uniqueRailTypes.map(type => `<option value="${type}">${type}</option>`).join('');
    loadRails();
}

function loadRails() {
    const railTypeSelect = document.getElementById('railType');
    const railSelect = document.getElementById('rail');
    const selectedRailType = railTypeSelect.value;
    const rails = railData.filter(item => item.railType === selectedRailType);
    railSelect.innerHTML = rails.map(rail => `<option value="${rail.rail}">${rail.rail}</option>`).join('');
}

function loadCurtainTypes() {
    const curtainTypeSelect = document.getElementById('curtainType');
    const uniqueCurtainTypes = [...new Set(curtainData.map(item => item.curtainType))];
    curtainTypeSelect.innerHTML = uniqueCurtainTypes.map(type => `<option value="${type}">${type}</option>`).join('');
    loadFabricTypes();
}

function loadFabricTypes() {
    const curtainTypeSelect = document.getElementById('curtainType');
    const fabricTypeSelect = document.getElementById('fabricType');
    const selectedCurtainType = curtainTypeSelect.value;
    const fabrics = curtainData.filter(item => item.curtainType === selectedCurtainType);
    fabricTypeSelect.innerHTML = fabrics.map(fabric => `<option value="${fabric.fabricType}">${fabric.fabricType}</option>`).join('');
}

function loadSheerCurtainTypes() {
    const sheerCurtainTypeSelect = document.getElementById('sheerCurtainType');
    const uniqueSheerCurtainTypes = [...new Set(sheerCurtainData.map(item => item.sheerCurtainType))];
    sheerCurtainTypeSelect.innerHTML = uniqueSheerCurtainTypes.map(type => `<option value="${type}">${type}</option>`).join('');
    loadSheerFabricTypes();
}

function loadSheerFabricTypes() {
    const sheerCurtainTypeSelect = document.getElementById('sheerCurtainType');
    const sheerFabricTypeSelect = document.getElementById('sheerFabricType');
    const selectedSheerCurtainType = sheerCurtainTypeSelect.value;
    const sheerFabrics = sheerCurtainData.filter(item => item.sheerCurtainType === selectedSheerCurtainType);
    sheerFabricTypeSelect.innerHTML = sheerFabrics.map(fabric => `<option value="${fabric.sheerFabricType}">${fabric.sheerFabricType}</option>`).join('');
}

function calculatePrice(type) {
    let width, quantity, result, data, selectedItem;

    switch(type) {
        case 'rail':
            width = parseFloat(document.getElementById('railSize').value);
            quantity = parseInt(document.getElementById('railQuantity').value);
            result = document.getElementById('railResult');
            data = railData;
            selectedItem = data.find(item => 
                item.railType === document.getElementById('railType').value && 
                item.rail === document.getElementById('rail').value
            );
            break;
        case 'curtain':
            width = parseFloat(document.getElementById('curtainWidth').value);
            quantity = parseInt(document.getElementById('curtainQuantity').value);
            result = document.getElementById('curtainResult');
            data = curtainData;
            selectedItem = data.find(item => 
                item.curtainType === document.getElementById('curtainType').value && 
                item.fabricType === document.getElementById('fabricType').value
            );
            break;
        case 'sheerCurtain':
            width = parseFloat(document.getElementById('sheerCurtainWidth').value);
            quantity = parseInt(document.getElementById('sheerCurtainQuantity').value);
            result = document.getElementById('sheerCurtainResult');
            data = sheerCurtainData;
            selectedItem = data.find(item => 
                item.sheerCurtainType === document.getElementById('sheerCurtainType').value && 
                item.sheerFabricType === document.getElementById('sheerFabricType').value
            );
            break;
    }

    if (selectedItem) {
        const price = selectedItem.price * width * quantity;
        result.value = price.toFixed(2) + ' บาท';
    } else {
        alert('ไม่พบข้อมูลราคาสำหรับตัวเลือกที่เลือก');
    }
}

function summarizeOrder() {
    let summary = '';
    let totalPrice = 0;
    let showTotal = true;

    const railType = document.getElementById('rail').value;
    const railSize = parseFloat(document.getElementById('railSize').value);
    const railQuantity = parseInt(document.getElementById('railQuantity').value);
    const railPrice = parseFloat(document.getElementById('railResult').value);

    const curtainType = document.getElementById('fabricType').value;
    const curtainWidth = parseFloat(document.getElementById('curtainWidth').value);
    const curtainQuantity = parseInt(document.getElementById('curtainQuantity').value);
    const curtainPrice = parseFloat(document.getElementById('curtainResult').value);

    const sheerCurtainType = document.getElementById('sheerFabricType').value;
    const sheerCurtainWidth = parseFloat(document.getElementById('sheerCurtainWidth').value);
    const sheerCurtainQuantity = parseInt(document.getElementById('sheerCurtainQuantity').value);
    const sheerCurtainPrice = parseFloat(document.getElementById('sheerCurtainResult').value);

    let height = parseFloat(document.getElementById('curtainHeight').value);
    let heightText = isNaN(height) ? 'สูงตามสั่ง' : height.toFixed(2);

    if (!isNaN(railPrice) && isNaN(curtainPrice) && isNaN(sheerCurtainPrice)) {
        summary += `${railType} ${railSize.toFixed(2)} = ${railQuantity} ชุด ${railPrice.toFixed(0)} บาท\n`;
        showTotal = false;
    }
    else if (isNaN(railPrice) && !isNaN(curtainPrice) && isNaN(sheerCurtainPrice)) {
        summary += `${curtainType}\n${curtainWidth.toFixed(2)}*${heightText} = ${curtainQuantity} ผืน ${curtainPrice.toFixed(0)} บาท\n`;
        showTotal = false;
    }
    else if (isNaN(railPrice) && isNaN(curtainPrice) && !isNaN(sheerCurtainPrice)) {
        summary += `${sheerCurtainType}\n${sheerCurtainWidth.toFixed(2)}*${heightText} = ${sheerCurtainQuantity} ผืน ${sheerCurtainPrice.toFixed(0)} บาท\n`;
        showTotal = false;
    }
    else {
        if (!isNaN(railPrice)) {
            summary += `${railType} ${railSize.toFixed(2)} = ${railQuantity} ชุด ${railPrice.toFixed(0)} บาท\n`;
            totalPrice += railPrice;
        }

        if (!isNaN(curtainPrice)) {
            summary += `${curtainType}\n${curtainWidth.toFixed(2)}*${heightText} = ${curtainQuantity} ผืน ${curtainPrice.toFixed(0)} บาท\n`;
            totalPrice += curtainPrice;
        }

        if (!railType.includes('1ชั้น') && !isNaN(sheerCurtainPrice)) {
            summary += `${sheerCurtainType}\n${sheerCurtainWidth.toFixed(2)}*${heightText} = ${sheerCurtainQuantity} ผืน ${sheerCurtainPrice.toFixed(0)} บาท\n`;
            totalPrice += sheerCurtainPrice;
        }
    }

    if (showTotal) {
        summary += `รวม ${totalPrice.toFixed(0)} บาท`;
    }

    document.getElementById('summaryResult').value = summary;
}

function copySummary() {
    const summaryText = document.getElementById('summaryResult');
    summaryText.select();
    summaryText.setSelectionRange(0, 99999);
    document.execCommand('copy');
    alert('ข้อความสรุปถูกคัดลอกแล้ว');
}

document.getElementById('railType').addEventListener('change', loadRails);
document.getElementById('curtainType').addEventListener('change', loadFabricTypes);
document.getElementById('sheerCurtainType').addEventListener('change', loadSheerFabricTypes);

window.onload = loadData; 