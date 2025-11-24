# Quick Manual Test Snippets (FastAPI)

Assumes the server is running at `http://localhost:8000` and the database is seeded/empty as appropriate. Adjust IDs if your data differs.

## Create
```bash
# Create user
curl -X POST http://localhost:8000/users \
  -H "Content-Type: application/json" \
  -d '{"email":"new.user@example.com","phone_number":"5550001234","password_hash":"hashed","is_active":true}'

# Create profile for that user (replace user_id if different)
curl -X POST http://localhost:8000/profiles \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"first_name":"New","last_name":"User","bio":"Hello!"}'

# Create post for that user
curl -X POST http://localhost:8000/posts \
  -H "Content-Type: application/json" \
  -d '{"author_id":1,"author_type":"USER","text_content":"My first post","privacy_setting":"PUBLIC","post_type":"ORIGINAL"}'
```

## Read
```bash
curl http://localhost:8000/users
curl http://localhost:8000/profiles
curl http://localhost:8000/posts
```

## Update
```bash
# Update user email
curl -X PUT http://localhost:8000/users/1 \
  -H "Content-Type: application/json" \
  -d '{"email":"updated.user@example.com"}'

# Update post text
curl -X PUT http://localhost:8000/posts/1 \
  -H "Content-Type: application/json" \
  -d '{"text_content":"Edited content"}'
```

## Delete
```bash
curl -X DELETE http://localhost:8000/profiles/1
curl -X DELETE http://localhost:8000/posts/1
curl -X DELETE http://localhost:8000/users/1
```
