from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

password = "SecurePass123!"
hashed = pwd_context.hash(password)
print(f"Hashed: {hashed}")
print(f"Length: {len(hashed)}")

result = pwd_context.verify(password, hashed)
print(f"Verification result: {result}")

wrong = pwd_context.verify("wrong", hashed)
print(f"Wrong password result: {wrong}")
