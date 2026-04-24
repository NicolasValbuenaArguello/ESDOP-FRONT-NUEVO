FROM nginx:alpine

# Borrar config default
RUN rm /etc/nginx/conf.d/default.conf

# Copiar Angular build
COPY browser/ /usr/share/nginx/html

# Config mínima para SPA
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Permisos
RUN chmod -R 755 /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]