# Python Data Cleaning 一般过程

### 1. 准备环境

- 安装必要的Python库，如 `pandas`、`numpy`、`pyreadstat` 等。
- 设置工作环境，确保Python环境和工具已就绪。

```python
import pandas as pd
import numpy as np
```

### 2. 导入数据

数据可以来自不同的文件格式和数据库，以下列出常见的导入步骤和对应命令：

#### 2.1 导入CSV文件

- 使用 `read_csv()` 方法导入CSV文件。
- 可以指定列名、跳过不需要的行、解析日期等。

```python
df = pd.read_csv('data.csv', skiprows=1, parse_dates=['Date'])
```

#### 2.2 导入Excel文件

- 使用 `read_excel()` 方法导入Excel文件。
- 可以选择特定工作表、跳过多余的行和列。

```python
df = pd.read_excel('data.xlsx', sheet_name='Sheet1', skiprows=2, usecols="A:D")
```

#### 2.3 导入SQL数据库数据

- 使用 `pymssql` 或 `mysql.connector` 连接SQL Server或MySQL。
- 使用 `read_sql()` 方法从SQL查询中读取数据。

```python
import pymssql
conn = pymssql.connect(server='server', user='user', password='pass', database='db')
df = pd.read_sql('SELECT * FROM table_name', conn)
```

#### 2.4 导入JSON文件

- 使用 `read_json()` 导入简单或嵌套的JSON数据。

```python
df = pd.read_json('data.json')
```

#### 2.5 导入SPSS、Stata、SAS文件

- 使用 `pyreadstat` 库读取SPSS（.sav）、Stata（.dta）和SAS数据，并保留元数据（如标签）。

```python
import pyreadstat
df, meta = pyreadstat.read_sav('data.sav')
```

### 3. 数据清理

#### 3.1 处理缺失值

- 使用 `isnull()` 和 `dropna()` 检查并移除缺失值。

```python
df.dropna(subset=['column_name'], inplace=True)
```

#### 3.2 数据类型转换

- 使用 `astype()` 将数据类型转换为适当的类型，如 `int`、`float`、`category` 等。

```python
df['column_name'] = df['column_name'].astype('float')
```

### 4. 数据可视化与分析

#### 4.1 生成统计摘要

- 使用 `describe()` 生成数据的统计摘要。

```python
df.describe()
```

#### 4.2 使用图表检测异常

- 通过 `hist()` 或 `boxplot()` 查看变量的分布和异常值。

```python
df['column_name'].hist()
```

### 5. 导出清理后的数据

- 使用 `to_csv()` 或 `to_excel()` 将清理后的数据导出为CSV或Excel文件。

```python
df.to_csv('cleaned_data.csv', index=False)
```

### 总结步骤：

1. **准备环境**：安装库、设置工作环境。
2. **导入数据**：从CSV、Excel、SQL、JSON、SPSS等导入数据到Pandas DataFrame。
3. **数据清理**：处理缺失值、转换数据类型。
4. **可视化和分析**：生成统计摘要、通过图表识别异常。
5. **导出数据**：将清理后的数据保存为CSV或Excel文件。

通过这些步骤，可以高效完成数据导入、清理、可视化和导出。

# 数据量大的处理方法

当你的数据量较大时（如500万行的CSV文件），处理数据的步骤需要优化，以避免内存溢出和提高效率。以下是针对大数据集的具体优化步骤和建议：

### 1. 使用分块读取数据

如果数据集非常大，可以使用 `read_csv()` 的 `chunksize` 参数分块读取数据。这样可以避免一次性将整个文件加载到内存中。

```python
chunksize = 100000  # 每次读取10万行
chunk_iter = pd.read_csv('large_data.csv', chunksize=chunksize)

for chunk in chunk_iter:
    # 处理每个数据块
    process(chunk)
```

### 2. 优化数据类型

在处理大数据集时，使用合适的数据类型可以减少内存占用。你可以在读取时指定数据类型，而不是让Pandas自动推断。

```python
dtypes = {
    'column1': 'int32',
    'column2': 'float32',
    'column3': 'category'  # 对类别型数据使用 category 类型
}
df = pd.read_csv('large_data.csv', dtype=dtypes)
```

### 3. 使用 `low_memory` 选项

`read_csv()` 的 `low_memory` 参数可以降低内存消耗，尤其是在处理数据类型混合的列时，但可能会稍微降低速度。

```python
df = pd.read_csv('large_data.csv', low_memory=True)
```

### 4. 按需选择列和行

如果你不需要所有列，可以使用 `usecols` 参数只读取指定列，减少不必要的内存占用。

```python
df = pd.read_csv('large_data.csv', usecols=['column1', 'column2'])
```

### 5. 内存优化的数值格式

对于数值列，尽可能使用较小的数据类型，如 `float32`、`int32`，而不是默认的 `float64` 或 `int64`。

```python
df['column1'] = df['column1'].astype('int32')
df['column2'] = df['column2'].astype('float32')
```

### 6. 处理缺失值时的优化

如果需要处理缺失值，也可以在读取时指定缺失值的处理方式，以节省后续处理时间。

```python
df = pd.read_csv('large_data.csv', na_values=['NA', ''], keep_default_na=False)
```

### 7. 使用 Dask 或 PySpark

如果数据集超出了单台机器的内存限制，可以考虑使用 `Dask` 或 `PySpark` 等库，它们支持并行计算并可以处理比内存大得多的数据。

```python
import dask.dataframe as dd
df = dd.read_csv('large_data.csv')
```

### 8. 持久化到更高效的格式

大数据集可以考虑转换为更高效的格式如 `Parquet` 或 `HDF5`，这些格式的文件体积更小、读取速度更快。

```python
df.to_parquet('data.parquet')  # 保存为Parquet格式
```

### 9. 并行处理数据

对于多核CPU，可以使用并行处理（如Python的 `multiprocessing` 模块）来加速数据处理。

```python
from multiprocessing import Pool

def process_chunk(chunk):
    # 在每个进程中处理数据块
    return chunk.apply(some_function)

with Pool(4) as p:
    results = p.map(process_chunk, chunk_iter)
```

### 总结大数据集优化策略

1. **分块读取**：使用 `chunksize` 分块处理数据。
2. **优化数据类型**：指定更小的数据类型（如 `int32`、`float32` 和 `category`）。
3. **按需读取**：使用 `usecols` 和 `low_memory` 控制读取内容。
4. **使用 Dask 或 PySpark**：当数据超出内存时，考虑使用分布式计算框架。
5. **转换为高效格式**：考虑将数据存储为 `Parquet` 或 `HDF5` 格式以提高效率。
6. **并行处理**：利用多核CPU并行处理数据。

通过这些优化，可以有效处理大规模数据集并保持系统的稳定性和性能。

# PySpark的使用方式

PySpark 是 Apache Spark 的 Python API，广泛用于处理大规模数据集。以下是 PySpark 的常见使用流程，从安装到数据处理的详细步骤和关键命令。

### 1. 安装 PySpark

#### 1.1 安装 Apache Spark 和 PySpark

首先，确保已安装 **Java**（要求 Java 8 或更高版本）和 **Python**。

**步骤：**

- 下载 Apache Spark：https://spark.apache.org/downloads.html
  - 选择“Pre-built for Apache Hadoop”版本。
  - 解压并设置 `SPARK_HOME` 环境变量。
- 安装 PySpark 包：

```bash
pip install pyspark
```

#### 1.2 验证安装

在终端运行 `pyspark` 命令，应该启动 PySpark 的交互式 shell。

```bash
pyspark
```

如果一切正常，将会看到 PySpark REPL 启动。

### 2. 配置 PySpark

PySpark 可以通过 `SparkConf` 类进行配置，用于设置资源、应用程序名称和其他运行参数。

```python
from pyspark import SparkConf, SparkContext

# 配置 Spark 参数
conf = SparkConf().setAppName("MyApp").setMaster("local[*]")  # 本地模式，使用所有CPU核心
sc = SparkContext(conf=conf)
```

常见参数：

- `setAppName`: 设置应用程序的名称。
- `setMaster`: 配置集群模式（例如，`local` 本地模式，`yarn` 在集群上运行）。
- `set("spark.executor.memory", "4g")`: 配置每个执行器的内存。

### 3. 初始化 SparkSession

Spark 2.x 版本之后，推荐使用 `SparkSession` 来管理 Spark 应用，而不是单独的 `SparkContext`。

```python
from pyspark.sql import SparkSession

# 创建 SparkSession
spark = SparkSession.builder \
    .appName("MyApp") \
    .config("spark.executor.memory", "2g") \
    .getOrCreate()
```

### 4. 数据导入

#### 4.1 从 CSV 文件导入数据

PySpark 使用 `spark.read` API 从不同的数据源读取数据，常见的是 CSV 文件。

```python
# 读取 CSV 文件
df = spark.read.csv("data.csv", header=True, inferSchema=True)
df.show()  # 显示数据
```

参数说明：

- `header=True`: 指定第一行是列名。
- `inferSchema=True`: 自动推断数据类型。

#### 4.2 从 Parquet 文件导入

Parquet 是高效的列式存储格式，适用于大规模数据处理。

```python
df = spark.read.parquet("data.parquet")
df.show()
```

#### 4.3 从 JSON 文件导入

```python
df = spark.read.json("data.json")
df.show()
```

#### 4.4 从 SQL 数据库导入

```python
# 连接到数据库
df = spark.read.format("jdbc").option("url", "jdbc:mysql://localhost:3306/dbname") \
    .option("driver", "com.mysql.cj.jdbc.Driver") \
    .option("dbtable", "tablename") \
    .option("user", "username").option("password", "password").load()
df.show()
```

### 5. 数据操作

PySpark 提供类似 Pandas 的 API 来操作数据，如过滤、选择、分组等。

#### 5.1 选择列

```python
df.select("column1", "column2").show()
```

#### 5.2 过滤数据

```python
df.filter(df["column1"] > 100).show()
```

#### 5.3 分组聚合

```python
df.groupBy("column1").agg({"column2": "mean"}).show()
```

#### 5.4 添加新列

```python
df = df.withColumn("new_column", df["column1"] * 2)
df.show()
```

### 6. 数据导出

#### 6.1 导出到 CSV 文件

```python
df.write.csv("output.csv", header=True)
```

#### 6.2 导出到 Parquet 文件

```python
df.write.parquet("output.parquet")
```

### 7. 运行 PySpark 脚本

可以使用 `spark-submit` 命令来运行 PySpark 脚本：

```bash
spark-submit --master local[*] my_script.py
```

参数：

- `--master`: 配置集群模式（如 `local[*]` 表示本地运行，`yarn` 表示在集群中运行）。
- `my_script.py`: 要运行的 PySpark 脚本。

### 8. 常用 PySpark 配置选项

- `spark.executor.memory`: 每个执行器分配的内存大小。
- `spark.driver.memory`: Driver进程的内存大小。
- `spark.sql.shuffle.partitions`: 控制分区的数量，适用于 `groupBy` 或 `join` 操作时，默认200。

### 总结步骤：

1. **安装和配置**：安装 PySpark 和 Apache Spark，设置 `SparkConf` 和 `SparkSession`。
2. **数据导入**：从 CSV、Parquet、JSON、数据库等多种源导入数据。
3. **数据操作**：进行列选择、过滤、分组聚合等常见数据操作。
4. **数据导出**：将处理后的数据导出到 CSV 或 Parquet 文件。
5. **脚本运行**：使用 `spark-submit` 提交和运行 PySpark 脚本。

通过这些步骤，您可以在 PySpark 中高效处理大规模数据集。

# 关系型数据库操作

首先要将数据库中的数据导入到 Python 中，然后进行清理和处理，最后再根据需求导出或存储为新的文件格式（如 CSV、JSON 等）。

### 1. 安装必要的库

首先，确保安装了 Python 库，这些库支持连接到 MySQL 或 Oracle 等关系型数据库。

- **安装 PyMySQL**（用于连接 MySQL）：

  ```bash
  pip install pymysql
  ```
- **安装 cx_Oracle**（用于连接 Oracle 21c 数据库）：

  ```bash
  pip install cx_Oracle
  ```
- **安装 pandas**（用于数据处理）：

  ```bash
  pip install pandas
  ```

### 2. 配置数据库连接

#### 2.1 连接 MySQL

使用 `pymysql` 来连接 MySQL 数据库，并使用 `pandas.read_sql()` 读取数据。

```python
import pymysql
import pandas as pd

# 连接 MySQL 数据库
connection = pymysql.connect(host='localhost',
                             user='your_user',
                             password='your_password',
                             database='your_database')

# 从 MySQL 中读取数据
query = "SELECT * FROM your_table"
df = pd.read_sql(query, connection)

# 关闭连接
connection.close()
```

#### 2.2 连接 Oracle 21c

使用 `cx_Oracle` 来连接 Oracle 数据库，并同样使用 `pandas.read_sql()` 读取数据。

```python
import cx_Oracle
import pandas as pd

# 连接 Oracle 数据库
dsn = cx_Oracle.makedsn("hostname", "port", service_name="service_name")
connection = cx_Oracle.connect(user="your_user", password="your_password", dsn=dsn)

# 从 Oracle 中读取数据
query = "SELECT * FROM your_table"
df = pd.read_sql(query, connection)

# 关闭连接
connection.close()
```

### 3. 数据清理和处理

导入数据后，使用 Pandas 对数据进行清理和处理。以下是常见的操作：

#### 3.1 检查缺失值

```python
# 查看缺失值
missing_values = df.isnull().sum()
print(missing_values)
```

#### 3.2 处理缺失值

可以通过删除含有缺失值的行或填充缺失值来处理数据。

```python
# 删除包含缺失值的行
df_cleaned = df.dropna()

# 或者填充缺失值
df_filled = df.fillna(value={"column_name": "default_value"})
```

#### 3.3 转换数据类型

如果某些列的数据类型不正确，可以使用 `astype()` 进行转换。

```python
df['column_name'] = df['column_name'].astype('int32')
```

#### 3.4 数据过滤和选择

可以通过条件过滤、列选择等操作进一步处理数据。

```python
# 筛选符合条件的行
filtered_df = df[df['column_name'] > 100]

# 选择某些列
selected_columns_df = df[['column1', 'column2']]
```

### 4. 数据导出

处理完数据后，你可以将数据导出为 CSV、JSON 或其他格式。

#### 4.1 导出为 CSV 文件

```python
df.to_csv('cleaned_data.csv', index=False)
```

#### 4.2 导出为 JSON 文件

```python
df.to_json('cleaned_data.json', orient='records')
```

### 5. 常见优化建议

#### 5.1 使用分块读取数据

对于非常大的数据库表，可以使用分块读取数据，避免一次性将大量数据加载到内存中。

```python
for chunk in pd.read_sql(query, connection, chunksize=10000):
    # 对每个数据块进行处理
    process(chunk)
```

#### 5.2 优化数据类型

在读取数据时，可以通过 `dtype` 参数优化数据类型，减少内存占用。

```python
df = pd.read_sql(query, connection, dtype={'column1': 'int32', 'column2': 'float32'})
```

### 6. 将清理后的数据回写到数据库（可选）

如果你需要将处理后的数据存回数据库，可以使用 `to_sql()` 方法。

```python
df_cleaned.to_sql('cleaned_table', connection, if_exists='replace', index=False)
```

### 总结步骤

1. **安装库**：安装用于连接数据库的库（如 `pymysql` 或 `cx_Oracle`）。
2. **连接数据库**：使用相应的 Python 库连接 MySQL 或 Oracle 数据库。
3. **数据导入**：通过 `pandas.read_sql()` 将数据库中的数据读取到 Pandas DataFrame 中。
4. **数据清理**：使用 Pandas 进行数据清理，包括处理缺失值、转换数据类型、过滤数据等。
5. **数据导出**：将清理后的数据导出为 CSV、JSON 或其他文件格式。
6. **回写数据库（可选）**：如果需要，也可以将清理后的数据写回数据库。

# Python 常用库文件介绍

### 1. Pandas

#### 特效与功能

`pandas` 是一个强大的 Python 数据处理库，专注于结构化数据的操作，尤其擅长处理**表格数据**。它提供了类似于 Excel 或 SQL 的功能，用于**数据清理、转换、过滤、合并**和**分析**，同时支持多种文件格式的导入和导出，如 CSV、Excel、JSON 等。

在数据清洗中，`pandas` 扮演着**数据处理核心工具**的角色，可以：

- **导入和导出**各种格式的数据文件（CSV、JSON、SQL 等）。
- **处理缺失值**（删除、填充等）。
- **数据过滤和选择**（按条件筛选数据、选择列或行）。
- **数据转换**（转换数据类型、重塑数据）。

#### 简单示例（Demo）

```python
import pandas as pd

# 创建一个简单的DataFrame
data = {'Name': ['Alice', 'Bob', None], 'Age': [25, None, 23], 'City': ['NY', 'LA', 'SF']}
df = pd.DataFrame(data)

# 查看前几行数据
print(df.head())

# 检查缺失值
print(df.isnull().sum())

# 填充缺失值
df_filled = df.fillna({'Name': 'Unknown', 'Age': 0})

# 显示处理后的数据
print(df_filled)
```

**输出：**

```
     Name   Age City
0   Alice  25.0   NY
1     Bob   NaN   LA
2    None  23.0   SF

Name    1
Age     1
City    0
dtype: int64

      Name   Age City
0    Alice  25.0   NY
1      Bob   0.0   LA
2  Unknown  23.0   SF
```

### 2. NumPy

#### 特效与功能

`numpy` 是 Python 中的科学计算库，专注于**高效的数值计算和多维数组操作**。它为数据清洗和数据分析提供了快速处理**大规模数值数据**的功能。`numpy` 支持矢量化操作（无需写循环），极大地提升了数组、矩阵等结构的计算效率。

在数据清洗中，`numpy` 主要用作**数值计算和数组操作的基础工具**，在需要快速进行**数值处理**时非常有用，如：

- 处理大规模数值数组。
- 快速执行矩阵运算和其他线性代数操作。
- 数学函数操作，如均值、中位数、标准差等。

#### 简单示例（Demo）

```python
import numpy as np

# 创建一个NumPy数组
arr = np.array([1, 2, 3, 4, 5])

# 计算数组的均值、标准差
mean = np.mean(arr)
std_dev = np.std(arr)

# 进行数组运算（所有元素乘以2）
arr_multiplied = arr * 2

# 输出结果
print(f"均值: {mean}, 标准差: {std_dev}")
print(f"数组乘以2: {arr_multiplied}")
```

**输出：**

```
均值: 3.0, 标准差: 1.4142135623730951
数组乘以2: [ 2  4  6  8 10]
```

### 3. pyreadstat

#### 特效与功能

`pyreadstat` 是一个专用于读取**SPSS (.sav)、Stata (.dta)、SAS (.sas7bdat)** 文件的库，并能保留这些统计文件中的**元数据**，如**变量标签、值标签**等。在处理统计数据时，`pyreadstat` 使得数据可以方便地从这些特定格式转换为 Pandas DataFrame 进行处理，尤其适合数据科学家和分析师处理来自统计分析软件的数据。

在数据清洗中，`pyreadstat` 的作用主要是帮助**导入复杂的统计数据**，并保留其元数据标签，方便后续在 Pandas 中处理和清理这些数据。

#### 简单示例（Demo）

```python
import pyreadstat

# 读取SPSS (.sav) 文件
df, meta = pyreadstat.read_sav('data.sav')

# 显示前几行数据
print(df.head())

# 查看元数据中的标签信息
print(meta.column_labels)  # 显示变量的标签
```

**输出：**

```
   id   age   gender
0   1  34.0     Male
1   2  28.0   Female
2   3  45.0     Male
...

{'id': 'Respondent ID', 'age': 'Age of Respondent', 'gender': 'Gender of Respondent'}
```

### 总结

- **Pandas** 是结构化数据处理的核心库，擅长对表格数据进行操作和清理。
- **NumPy** 是数值计算的基础库，提供高效的数组和矩阵操作，擅长大规模数值数据处理。
- **pyreadstat** 专注于从统计软件（如 SPSS、Stata、SAS）中导入数据，并保留元数据，适合处理复杂的统计数据文件。

这些库可以组合使用，实现数据清洗中的不同任务：`pyreadstat` 导入数据，`pandas` 处理结构化数据，`numpy` 用于高效数值计算。










end
