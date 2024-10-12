# backend/Dockerfile

FROM node:22

# Instalar dependências do sistema, incluindo o ffmpeg
RUN apt-get update && apt-get install -y ffmpeg

# Definir as credenciais do Google Cloud como uma variável de ambiente em uma linha
ENV GOOGLE_APPLICATION_CREDENTIALS_JSON="{\"type\":\"service_account\",\"project_id\":\"smart-report-438102\",\"private_key_id\":\"509a4747cf0da5a59bef4097971ef4f150952398\",\"private_key\":\"-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDCFazO1fgpfJX3\\nilNiZO82MNJSLIGtdywxM5GY7uSQgU1ZKASgA+HCvgy7ZsRzRQwrnPU9kCfIzaZG\\nrbCtB4ylPmVDwjSoPwMW195gATNMfshAEvNzZSn2vSeioQNm4tQSvLsSzVmWznBJ\\n7fwKus5naIOQfm279/cKM6RGtGTXJgXbu9Gy/sS7keYWdEm0l4HlybQbxuQlGTa5\\nHtaCaXorgbsjtqnpP94PIFL5ox+V6spx++mn/ERVq6PDY+T/mXhxQY8Q7Kf2CFx9\\nj+3c5KbKvretQiy0qTJOMF2ZMEiZAexbcQ+KyGb3BqZk3v3tM7PbRjL/TBLjHCoE\\n3ILZp08dAgMBAAECggEACovFIX0OGGpWYhvFpvpPPD2ADtUvxluheVqbvfi3JI9T\\nbbWHYM7X24OFAMGCCbXAsPWnpsIjQ0hCEXjvzssdo5SlydOEQHh3ZBbz6flkDp3x\\n/CH7fAj3yYTi4eBIEB+3AH35rU50CzDUTaltPAOwDP2TGTd2zNNZvK0XL1IEi7iD\\nNxwsYhyXy3opy/33pmGUALG20zcKpgkRVe/Cxt4GxxhZRVCjc5hYGEh8v9ez/7Ht\\n2Ka+MIu0IrgyjDFMlKtRqBalAQb4P8C5YvFmxCDfFa4obu/YEWTrFPeklpUWDtFP\\n4/VJwem5TYxNOgj2MnhhMD3qtSn73UgUoRUGnFkIWQKBgQDkIK6WH5+COx9OrG4D\\nJ8pbqe3fG02pG0A9PU7f87D7D2ouK+lMGYp8Okaz+bmd2ld3vbfCo1EwZyQO4yJa\\ntC2kws6Ytbfuq7da4kxVL9W3J42fWc1SJXBSBAHwb2gNHYPgCOeOKLGNScJm5rdo\\nb29Gj3KvxyuSN1nG+0hii0qYtQKBgQDZzDR9e5Eb55qw/sWxF+BxFHFAFyhrih3X\\nPA1yuq64pcRQT/9ku1Y/leTgEJNduVolHYESNz5Ku+0iafNzL1Bp/pIhlzdviPHr\\nBw7Hifwm5dg9Lgx0Jkc/35dD8vX5H95BbasIIRLc6oy+2sNZXJXZlMLhTBL8T8Uy\\naUrrCj5lyQKBgHSibQCeLGxmE+yiZiDA4EobSF3wVLVoFGD7Dm+b5VmHGQ+ALehV\\niqNXHDz6KbeWIXA8FE60N1da9GmUIUVkp418eCpFhkPFkZoq50IKkebxlwvo2vvr\\n3lBgcilenEFQXNNXWiQplBWbp4P647zGdIsL3mQWnaVFHWaJpQmVE8+dAoGAKILB\\nKK35ObWEonNhFiWYy6+/uOoVzJruHgC/h52Nri63KzEWEgh+bGlXHw42OvKk/85T\\nGa5I2eHGo+YNMFmWnYCKcdEMsKRKSysO5rKVwi5yYD7WdixAiHLwUeU5N1NkJcte\\nSq7MMWc3MrDCMTb1cHkpHnrl9SRpS40mMD3BiXECgYEAvVp09DFWiMwqX95X+74v\\nqFJ7CUXfzFtF6/w4ne2Tm54PJlK8QEmmETu+tA//jZ3VpR+MSM8Oft4BUXkGEXou\\nWIR+eEMRcTYqvtNChtah5VQg8b6Fq1yXmnUICXrl62lDPgljXiplmSMsXDgV8G4m\\nFNCKW4I2h+QqMMwku7G6CQI=\\n-----END PRIVATE KEY-----\\n\",\"client_email\":\"smart-report@smart-report-438102.iam.gserviceaccount.com\",\"client_id\":\"117071099460286855665\",\"auth_uri\":\"https://accounts.google.com/o/oauth2/auth\",\"token_uri\":\"https://oauth2.googleapis.com/token\",\"auth_provider_x509_cert_url\":\"https://www.googleapis.com/oauth2/v1/certs\",\"client_x509_cert_url\":\"https://www.googleapis.com/robot/v1/metadata/x509/smart-report%40smart-report-438102.iam.gserviceaccount.com\"}"

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json into the container
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application's source code
COPY . .

# Build the application
RUN npm run build

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:dev"]