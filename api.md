# /message 请求方式
```
curl --location --request POST 'http://20.25.33.94:8080/message' \
--header 'Content-Type: application/json' \
--data-raw '{
    "question": "我的上一个问题是什么",
    "parentMessageId":"11cd43d9-1bc6-4356-8108-1b7c94520c73",
    "user": "delen"
}'
```

# 正常情况

```
```
# 异常情况
```
{
    "statusCode": 5001,
    "message": "[parentMessageId]:11cd43d9-1bc6-4356-8108-1b7c94520c73  [prompt]:\"我的上一个问题是什么\", 请求三次报错"
}
```