// 页面加载时从 JSON 文件中加载默认费率
window.addEventListener('load', function() {
    const timestamp = new Date().getTime();  // 防止缓存
    fetch(`rates.json?t=${timestamp}`)  // 请求中添加时间戳
        .then(response => response.json())
        .then(data => {
            // 使用 JSON 文件中的默认费率填充输入框
            document.getElementById('pension-rate-employer').value = data.pension.employer;
            document.getElementById('pension-rate-personal').value = data.pension.personal;
            document.getElementById('medical-rate-employer').value = data.medical.employer;
            document.getElementById('medical-rate-personal').value = data.medical.personal;
            document.getElementById('unemployment-rate-employer').value = data.unemployment.employer;
            document.getElementById('unemployment-rate-personal').value = data.unemployment.personal;
            document.getElementById('injury-rate-employer').value = data.injury.employer;
            if (data.injury.personal !== null) {
                document.getElementById('injury-rate-personal').value = data.injury.personal;
            }
            document.getElementById('maternity-rate-employer').value = data.maternity.employer;
            if (data.maternity.personal !== null) {
                document.getElementById('maternity-rate-personal').value = data.maternity.personal;
            }
            document.getElementById('housing-rate-employer').value = data.housing.employer;
            document.getElementById('housing-rate-personal').value = data.housing.personal;

            // 将税率数据保存为全局变量
            window.taxLevels = data.tax.levels;
        });

    // 绑定计算按钮事件
    document.getElementById('calculate').addEventListener('click', calculateInsurance);
});

// 计算五险一金和个人所得税
function calculateInsurance() {
    const salary = parseFloat(document.getElementById('salary').value);
    if (isNaN(salary)) {
        document.getElementById('result').innerHTML = '<p>请输入有效工资金额。</p>';
        return;
    }

    // 获取用户输入的费率
    const pensionRateEmployer = parseFloat(document.getElementById('pension-rate-employer').value) / 100;
    const pensionRatePersonal = parseFloat(document.getElementById('pension-rate-personal').value) / 100;
    const medicalRateEmployer = parseFloat(document.getElementById('medical-rate-employer').value) / 100;
    const medicalRatePersonal = parseFloat(document.getElementById('medical-rate-personal').value) / 100;
    const unemploymentRateEmployer = parseFloat(document.getElementById('unemployment-rate-employer').value) / 100;
    const unemploymentRatePersonal = parseFloat(document.getElementById('unemployment-rate-personal').value) / 100;
    const injuryRateEmployer = parseFloat(document.getElementById('injury-rate-employer').value) / 100;
    const injuryRatePersonal = parseFloat(document.getElementById('injury-rate-personal').value) / 100 || 0;
    const maternityRateEmployer = parseFloat(document.getElementById('maternity-rate-employer').value) / 100;
    const maternityRatePersonal = parseFloat(document.getElementById('maternity-rate-personal').value) / 100 || 0;
    const housingRateEmployer = parseFloat(document.getElementById('housing-rate-employer').value) / 100;
    const housingRatePersonal = parseFloat(document.getElementById('housing-rate-personal').value) / 100;

    // 计算各项费用
    const pensionEmployer = salary * pensionRateEmployer;
    const pensionPersonal = salary * pensionRatePersonal;
    const medicalEmployer = salary * medicalRateEmployer;
    const medicalPersonal = salary * medicalRatePersonal;
    const unemploymentEmployer = salary * unemploymentRateEmployer;
    const unemploymentPersonal = salary * unemploymentRatePersonal;
    const injuryEmployer = salary * injuryRateEmployer;
    const injuryPersonal = salary * injuryRatePersonal;
    const maternityEmployer = salary * maternityRateEmployer;
    const maternityPersonal = salary * maternityRatePersonal;
    const housingEmployer = salary * housingRateEmployer;
    const housingPersonal = salary * housingRatePersonal;

    const totalPersonal = pensionPersonal + medicalPersonal + unemploymentPersonal + injuryPersonal + maternityPersonal + housingPersonal;
    const totalEmployer = pensionEmployer + medicalEmployer + unemploymentEmployer + injuryEmployer + maternityEmployer + housingEmployer;
    const remainingSalary = salary - totalPersonal;

    // 计算个人所得税
    const taxableIncome = remainingSalary - 5000; // 每月收入减去5000免征额
    let annualTaxableIncome = taxableIncome * 12; // 年度应纳税所得额
    let tax = 0;

    // 根据 JSON 中的税率信息计算个人所得税
    for (let level of window.taxLevels) {
        if (annualTaxableIncome > level.min && (!level.max || annualTaxableIncome <= level.max)) {
            tax = annualTaxableIncome * (level.rate / 100) - level.deduction;
            break;
        }
    }

    const monthlyTax = tax / 12; // 月应纳个人所得税

    // 显示结果
    const results = `
        <table border="1">
            <tr>
                <th>项目</th>
                <th>单位缴纳</th>
                <th>个人缴纳</th>
                <th>费率 (%)</th>
            </tr>
            <tr>
                <td>养老保险</td>
                <td>${pensionEmployer.toFixed(2)} 元</td>
                <td>${pensionPersonal.toFixed(2)} 元</td>
                <td>单位: ${(pensionRateEmployer * 100).toFixed(2)}%, 个人: ${(pensionRatePersonal * 100).toFixed(2)}%</td>
            </tr>
            <tr>
                <td>医疗保险</td>
                <td>${medicalEmployer.toFixed(2)} 元</td>
                <td>${medicalPersonal.toFixed(2)} 元</td>
                <td>单位: ${(medicalRateEmployer * 100).toFixed(2)}%, 个人: ${(medicalRatePersonal * 100).toFixed(2)}%</td>
            </tr>
            <tr>
                <td>失业保险</td>
                <td>${unemploymentEmployer.toFixed(2)} 元</td>
                <td>${unemploymentPersonal.toFixed(2)} 元</td>
                <td>单位: ${(unemploymentRateEmployer * 100).toFixed(2)}%, 个人: ${(unemploymentRatePersonal * 100).toFixed(2)}%</td>
            </tr>
            <tr>
                <td>工伤保险</td>
                <td>${injuryEmployer.toFixed(2)} 元</td>
                <td>${injuryPersonal.toFixed(2)} 元</td>
                <td>单位: ${(injuryRateEmployer * 100).toFixed(2)}%, 个人: ${(injuryRatePersonal * 100).toFixed(2)}%</td>
            </tr>
            <tr>
                <td>生育保险</td>
                <td>${maternityEmployer.toFixed(2)} 元</td>
                <td>${maternityPersonal.toFixed(2)} 元</td>
                <td>单位: ${(maternityRateEmployer * 100).toFixed(2)}%, 个人: ${(maternityRatePersonal * 100).toFixed(2)}%</td>
            </tr>
            <tr>
                <td>住房公积金</td>
                <td>${housingEmployer.toFixed(2)} 元</td>
                <td>${housingPersonal.toFixed(2)} 元</td>
                <td>单位: ${(housingRateEmployer * 100).toFixed(2)}%, 个人: ${(housingRatePersonal * 100).toFixed(2)}%</td>
            </tr>
            <tr>
                <td><strong>合计</strong></td>
                <td><strong>${totalEmployer.toFixed(2)} 元</strong></td>
                <td><strong>${totalPersonal.toFixed(2)} 元</strong></td>
                <td><strong>个人费率总计: ${(pensionRatePersonal + medicalRatePersonal + unemploymentRatePersonal + injuryRatePersonal + maternityRatePersonal + housingRatePersonal).toFixed(2)}%</strong></td>
            </tr>
        </table>
        <p><strong>每月应纳个人所得税：</strong> ${monthlyTax.toFixed(2)} 元</p>
        <p><strong>每月剩余工资：</strong> ${(remainingSalary - monthlyTax).toFixed(2)} 元</p>
    `;
    
    document.getElementById('result').innerHTML = results;
}
