// 定义普通数字和大写数字的对照表
const normalDigits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const capitalDigits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
const units = ['', '拾', '佰', '仟'];
const bigUnits = ['', '万', '亿', '兆'];

// 将数字转换为中文金额
function numberToChinese(n, digits) {
    n = parseFloat(n);
    if (isNaN(n)) return '';
    let negative = n < 0 ? '负' : '';
    n = Math.abs(n);

    let fraction = n.toString().split('.')[1] || '';
    n = Math.floor(n);

    let result = '';
    let unitPos = 0;
    let zero = true;

    while (n > 0) {
        let section = n % 10000;
        let sectionChinese = sectionToChinese(section, digits);
        if (sectionChinese !== '') {
            result = sectionChinese + bigUnits[unitPos] + result;
        } else if (!result.startsWith(digits[0])) {
            result = digits[0] + result;
        }
        n = Math.floor(n / 10000);
        unitPos++;
    }

    result = result || digits[0];
    result = result.replace(/零+/g, '零');
    result = result.replace(/零(万|亿|兆)/g, '$1');
    result = result.replace(/亿万/g, '亿');
    result += '元';

    if (fraction) {
        let fracResult = '';
        for (let i = 0; i < fraction.length && i < 2; i++) {
            let num = fraction[i];
            let unit = i === 0 ? '角' : '分';
            if (digits[num] !== '零') {
                fracResult += digits[num] + unit;
            }
        }
        result += fracResult || '零';
    } else {
        result += '整';
    }

    return negative + result;
}

function sectionToChinese(section, digits) {
    let strIns = '', chnStr = '';
    let unitPos = 0;
    let zero = true;
    while (section > 0) {
        let v = section % 10;
        if (v === 0) {
            if (!zero) {
                zero = true;
                chnStr = digits[0] + chnStr;
            }
        } else {
            zero = false;
            strIns = digits[v] + units[unitPos];
            chnStr = strIns + chnStr;
        }
        unitPos++;
        section = Math.floor(section / 10);
    }
    return chnStr;
}

// 将输入的数字添加千分位并转换为中文
function formatNumberWithCommas(number) {
    let parts = number.toString().split('.');
    parts[0] = parts[0].replace(/^0+/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
}

// 复制到剪切板功能
function copyToClipboard(elementId) {
    const textToCopy = document.getElementById(elementId).textContent;
    const tempInput = document.createElement('textarea');
    tempInput.value = textToCopy;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    alert('复制成功: ' + textToCopy);
}

// 监听输入变化
document.getElementById('arabicInput').addEventListener('input', function (event) {
    let inputValue = event.target.value.replace(/,/g, ''); // 去掉已有的逗号
    inputValue = inputValue.replace(/[^\d.]/g, ''); // 去除非数字和小数点的字符

    if (inputValue !== '') {
        // 自动添加千分位
        const formattedValue = formatNumberWithCommas(inputValue);
        event.target.value = formattedValue;

        // 转换为中文普通数字
        document.getElementById('normalNumber').textContent = numberToChinese(inputValue, normalDigits);

        // 转换为中文大写数字
        document.getElementById('capitalNumber').textContent = numberToChinese(inputValue, capitalDigits);
    } else {
        document.getElementById('normalNumber').textContent = '-';
        document.getElementById('capitalNumber').textContent = '-';
    }
});
