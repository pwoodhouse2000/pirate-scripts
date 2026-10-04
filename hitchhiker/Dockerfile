# Static site served by nginx on Cloud Run (listens on $PORT, default 8080)
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY index.html /usr/share/nginx/html/
COPY css /usr/share/nginx/html/css
COPY js /usr/share/nginx/html/js
ENV PORT=8080
EXPOSE 8080
