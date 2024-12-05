<!--
 * @Author: Libra
 * @Date: 2024-12-04 16:26:48
 * @LastEditors: Libra
 * @Description:
-->

# 考试创建命令行工具

这是一个用于创建在线考试的命令行工具。

## 配置文件说明

配置文件 `config/exam-config.json` 中的字段说明：

### 基础配置

- `apiBaseUrl`: API 服务器地址
- `token`: 认证令牌
- `useMultipleRooms`: 是否使用多个房间(可以测试换考场)

### 项目配置 (project)

| 字段名                   | 说明                  | 示例值                     |
| ------------------------ | --------------------- | -------------------------- |
| name                     | 项目名称              | "Libra test"               |
| shortName                | 项目简称              | "dddd"                     |
| startAt                  | 项目开始时间          | "2024-12-04 16:21:00"      |
| endAt                    | 项目结束时间          | "2024-12-06 16:21:00"      |
| companyId                | 公司 ID               | "64fe70d9678850220a5669cc" |
| faceDiff                 | 人脸识别难度 (1-简单) | 1                          |
| fixedPosition            | 是否固定座位          | true                       |
| lateSecond               | 允许迟到时间(秒)      | 600                        |
| submitSecond             | 允许提交时间(秒)      | 600                        |
| requirement              | 考试机须知            | "<p>1111</p>"              |
| admissionCardRequirement | 准考证须知            | "<p>2222</p>"              |
| note                     | 备注信息              | ""                         |

### 时段配置 (periods)

时段配置是一个数组，可以包含多个时段，每个时段可以包含多个科目。

每个时段的配置：

| 字段名   | 说明         | 示例值                |
| -------- | ------------ | --------------------- |
| name     | 时段名称     | "时段 1"              |
| duration | 考试时长(秒) | 6000                  |
| startAt  | 时段开始时间 | "2024-12-04 16:21:00" |
| subjects | 科目配置数组 | [...]                 |

### 科目配置 (subjects)

每个时段下的 subjects 数组中的科目配置：

| 字段名            | 说明               | 示例值                     |
| ----------------- | ------------------ | -------------------------- |
| name              | 科目名称           | "科目 1"                   |
| duration          | 考试时长(秒)       | 6000                       |
| calculatorEnabled | 是否允许使用计算器 | true                       |
| showScore         | 是否显示分数       | true                       |
| note              | 备注信息           | "科目 1 备注"              |
| companyId         | 公司 ID            | "64fe70d9678850220a5669cc" |
| parts             | 子卷配置数组       | [...]                      |

### 子卷配置 (parts)

每个科目下的 parts 数组中的子卷配置：

| 字段名             | 说明         | 示例值        |
| ------------------ | ------------ | ------------- |
| name               | 子卷名称     | "子卷 1"      |
| note               | 备注信息     | "子卷 1 备注" |
| optionRandomized   | 是否随机选项 | true          |
| questionRandomized | 是否随机题目 | true          |

## 配置文件示例

```json
{
  "project": {
    // 项目配置...
  },
  "periods": [
    {
      "name": "时段1",
      "duration": 6000,
      "startAt": "2024-12-04 16:21:00",
      "subjects": [
        {
          "name": "科目1",
          "duration": 6000,
          "parts": [
            {
              "name": "子卷1",
              "note": "子卷1备注",
              "optionRandomized": true,
              "questionRandomized": true
            }
          ]
        }
      ]
    }
  ]
}
```

## 使用方法

1. 安装依赖：

```bash
npm install
```

2. 使用配置文件创建考试：

```bash
npm start create -c config/exam-config.json
```

## 执行结果

执行成功后会显示：

- 项目 ID：创建的考试项目 ID
- 每个时段的 ID
- 每个科目的 ID
- 每个子卷的 ID

这些 ID 会按照创建顺序依次显示，可用于后续操作。

## 房间登录码

```
1602     	     东塔楼16层1602室   	 2dff416735774e44acd2
1605     	     东塔楼16层1605室   	 21322687a46f479da046
```
