document.getElementById('country').addEventListener('change', function() {
    const selectedOption = this.options[this.selectedIndex];
    const defaultRate = selectedOption.getAttribute('data-rate');
    
    if (defaultRate !== "0") {
        document.getElementById('rate').value = defaultRate;
    } else {
        document.getElementById('rate').value = '';
    }
});

document.getElementById('calculateBtn').addEventListener('click', function() {
    const price = parseFloat(document.getElementById('price').value);
    let rate = parseFloat(document.getElementById('rate').value);

    if (isNaN(price) || price <= 0) {
        alert('请输入有效的商品价格');
        return;
    }
    
    if (isNaN(rate) || rate <= 0) {
        alert('请输入有效的增值税率');
        return;
    }

    const vatAmount = calculateVAT(price, rate);
    const priceWithVAT = price + vatAmount;

    // 价内税: 含税价格 = 原价 + 税额
    document.getElementById('postTaxPrice').textContent = priceWithVAT.toFixed(2) + ' 元';
    
    // 价外税: 增值税
    document.getElementById('vatAmount').textContent = vatAmount.toFixed(2) + ' 元';

    // 不含税价格 (原价)
    document.getElementById('preTaxPrice').textContent = price.toFixed(2) + ' 元';
    
    // 显示计算公式
    const formula = `增值税计算公式：\n税额 = 不含税价格 × 税率 / 100\n税后价格 = 不含税价格 + 税额\n`;
    document.getElementById('formula').textContent = formula;
});

function calculateVAT(price, rate) {
    return price * rate / 100;
}
