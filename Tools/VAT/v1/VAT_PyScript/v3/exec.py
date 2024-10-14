from js import alert

# 事件对象 event 是自动传递的
def calculate_vat(event=None):
    price_input = Element("price").value
    rate_input = Element("rate").value

    try:
        price = float(price_input)
        rate = float(rate_input)

        if price <= 0 or rate <= 0:
            alert("请输入有效的价格和税率")
            return
        
        vat_amount = price * rate / 100
        price_with_vat = price + vat_amount
        
        # 更新结果
        Element("preTaxPrice").write(f"{price:.2f} 元")
        Element("vatAmount").write(f"{vat_amount:.2f} 元")
        Element("postTaxPrice").write(f"{price_with_vat:.2f} 元")
        
        # 显示计算公式
        formula = """增值税计算公式：
        税额 = 不含税价格 × 税率 / 100
        税后价格 = 不含税价格 + 税额"""
        Element("formula").write(formula)

    except ValueError:
        alert("请输入有效的数字")

# 当用户从下拉框选择国家时，更新税率输入框的值
def update_rate(event=None):
    country_select = Element("country")
    rate_input = Element("data-rate")
    price_input = Element("data-rate")
    
    selected_option = country_select.element.options[country_select.element.selectedIndex]
    default_rate = selected_option.getAttribute("data-rate")

    if default_rate != "0":
        rate_input.element.value = default_rate

    # 恢复下拉框的可选状态（假设用户没有手动修改税率）
    country_select.element.disabled = False

# 监听税率输入框，当用户手动修改税率时禁用下拉框
def on_rate_input(event=None):
    rate_input = Element("rate")
    country_select = Element("country")

    # 如果用户修改了税率输入框，则禁用下拉框
    if rate_input.value:
        country_select.element.disabled = True
