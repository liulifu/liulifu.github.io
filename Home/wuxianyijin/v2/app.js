// 页面加载时从 JSON 文件中加载默认费率
window.addEventListener('load', function() {
    fetch('rates.json')
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
            document.getElementById('maternity-rate-employer').value = data.maternity.employer;
            document.getElementById('housing-rate-employer').value = data.housing.employer;
            document.getElementById('housing-rate-personal').value = data.housing.personal;
        });

    // 绑定计算按钮事件
    document.getElementById('calculate').addEventListener('click', calculateInsurance);
});

// 计算五险一金
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
    const maternityRateEmployer = parseFloat(document.getElementById('maternity-rate-employer').value) / 100;
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
    const maternityEmployer = salary * maternityRateEmployer;
    const housingEmployer = salary * housingRateEmployer;
    const housingPersonal = salary * housingRatePersonal;

    const totalPersonal = pensionPersonal + medicalPersonal + unemploymentPersonal + housingPersonal;
    const remainingSalary = salary - totalPersonal;

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
                <td>免缴</td>
                <td>单位: ${(injuryRateEmployer * 100).toFixed(2)}%, 个人: 0%</td>
            </tr>
            <tr>
                <td>生育保险</td>
                <td>${maternityEmployer.toFixed(2)} 元</td>
                <td>免缴</td>
                <td>单位: ${(maternityRateEmployer * 100).toFixed(2)}%, 个人: 0%</td>
            </tr>
            <tr>
                <td>住房公积金</td>
                <td>${housingEmployer.toFixed(2)} 元</td>
                <td>${housingPersonal.toFixed(2)} 元</td>
                <td>单位: ${(housingRateEmployer * 100).toFixed(2)}%, 个人: ${(housingRatePersonal * 100).toFixed(2)}%</td>
            </tr>
        </table>
        <p><strong>每月剩余工资：</strong> ${remainingSalary.toFixed(2)} 元</p>
    `;
    
    document.getElementById('result').innerHTML = results;
}
