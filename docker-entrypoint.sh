#!/bin/sh

# Generate env-config.js with runtime environment variables
cat <<EOF > /usr/share/nginx/html/env-config.js
window._env_ = {
  REACT_APP_GITHUB_TOKEN: "${REACT_APP_GITHUB_TOKEN}",
  REACT_APP_GITHUB_USERNAME: "${REACT_APP_GITHUB_USERNAME}",
  REACT_APP_DEFAULT_PROFILES: '${REACT_APP_DEFAULT_PROFILES}'
};
EOF

echo "Runtime environment configuration generated:"
cat /usr/share/nginx/html/env-config.js

# Execute the CMD (nginx)
exec "$@"
