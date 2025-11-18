# VISITOR TRACKING SYSTEM

A technical exploration and guide


## Part 1

### 1. Overview

This document outlines the implementation of a visitor tracking system for your static personal blog hosted on GitHub Pages. The system utilizes Cloudflare Workers to intercept visitor requests, capture IP addresses and timestamps, and forward this information to a Virtual Private Server (VPS) for storage. This approach ensures that your VPS remains concealed while effectively logging visitor data.

### 2. Architecture

The solution comprises three primary components:

1. **GitHub Pages Blog** : Your existing static blog hosted at `https://liulifu.github.io/`.
2. **Cloudflare Worker** : A serverless function that intercepts incoming requests to your blog, extracts visitor information, and forwards it to the VPS.
3. **VPS Backend Service** : An API endpoint on your VPS that receives the forwarded data and stores it locally.

### 3. Implementation Details

#### a. Cloudflare Worker

The Cloudflare Worker is responsible for:

- Intercepting incoming HTTP requests to your blog.
- Extracting the visitor's IP address and the current timestamp.
- Forwarding the extracted data to the VPS backend service.

  **Implementation Steps** :

1. **Create a Cloudflare Worker** :

- Log in to your Cloudflare account and navigate to **Workers & Pages** .
- Click on **Create a Worker** and select the domain associated with your blog.

1. **Configure the Worker Script** :

- Use the following JavaScript code as a template:

  <pre class="!overflow-visible"><div class="dark bg-gray-950 contain-inline-size rounded-md border-[0.5px] border-token-border-medium relative"><div class="flex items-center text-token-text-secondary bg-token-main-surface-secondary px-4 py-2 text-xs font-sans justify-between rounded-t-md h-9">javascript</div><div class="sticky top-9 md:top-[5.75rem]"><div class="absolute bottom-0 right-2 flex h-9 items-center"><div class="flex items-center rounded bg-token-main-surface-secondary px-2 font-sans text-xs text-token-text-secondary"><span class="" data-state="closed"><button class="flex gap-1 items-center py-1"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="icon-sm"><path fill-rule="evenodd" clip-rule="evenodd" d="M7 5C7 3.34315 8.34315 2 10 2H19C20.6569 2 22 3.34315 22 5V14C22 15.6569 20.6569 17 19 17H17V19C17 20.6569 15.6569 22 14 22H5C3.34315 22 2 20.6569 2 19V10C2 8.34315 3.34315 7 5 7H7V5ZM9 7H14C15.6569 7 17 8.34315 17 10V15H19C19.5523 15 20 14.5523 20 14V5C20 4.44772 19.5523 4 19 4H10C9.44772 4 9 4.44772 9 5V7ZM5 9C4.44772 9 4 9.44772 4 10V19C4 19.5523 4.44772 20 5 20H14C14.5523 20 15 19.5523 15 19V10C15 9.44772 14.5523 9 14 9H5Z" fill="currentColor"></path></svg>Copy code</button></span></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="!whitespace-pre hljs language-javascript">addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
  });

  async function handleRequest(request) {
    // Extract visitor's IP address
    const visitorIP = request.headers.get('CF-Connecting-IP');
    const visitTime = new Date().toISOString();

    // Send visitor information to VPS
    const vpsUrl = 'https://your-vps-domain.com/api/log'; // Replace with your VPS URL
    const payload = JSON.stringify({
      ip: visitorIP,
      time: visitTime
    });

    await fetch(vpsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    });

    // Proceed with the original request
    return fetch(request);
  }
  </code></div></div></pre>
- Replace `'https://your-vps-domain.com/api/log'` with the actual URL of your VPS backend service.

1. **Deploy the Worker** :

- Save the script and deploy the Worker.
- Ensure the Worker is active and correctly linked to your blog's domain.

#### b. VPS Backend Service

The VPS backend service is responsible for:

- Receiving the visitor data forwarded by the Cloudflare Worker.
- Storing the data in a local file or database for future reference.

  **Implementation Steps** :

1. **Set Up the VPS** :

- Ensure your VPS is running and accessible via the domain specified in the Worker script.

1. **Install Required Software** :

- Install Python and the Flask framework:
  <pre class="!overflow-visible"><div class="dark bg-gray-950 contain-inline-size rounded-md border-[0.5px] border-token-border-medium relative"><div class="flex items-center text-token-text-secondary bg-token-main-surface-secondary px-4 py-2 text-xs font-sans justify-between rounded-t-md h-9">bash</div><div class="sticky top-9 md:top-[5.75rem]"><div class="absolute bottom-0 right-2 flex h-9 items-center"><div class="flex items-center rounded bg-token-main-surface-secondary px-2 font-sans text-xs text-token-text-secondary"><span class="" data-state="closed"><button class="flex gap-1 items-center py-1"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="icon-sm"><path fill-rule="evenodd" clip-rule="evenodd" d="M7 5C7 3.34315 8.34315 2 10 2H19C20.6569 2 22 3.34315 22 5V14C22 15.6569 20.6569 17 19 17H17V19C17 20.6569 15.6569 22 14 22H5C3.34315 22 2 20.6569 2 19V10C2 8.34315 3.34315 7 5 7H7V5ZM9 7H14C15.6569 7 17 8.34315 17 10V15H19C19.5523 15 20 14.5523 20 14V5C20 4.44772 19.5523 4 19 4H10C9.44772 4 9 4.44772 9 5V7ZM5 9C4.44772 9 4 9.44772 4 10V19C4 19.5523 4.44772 20 5 20H14C14.5523 20 15 19.5523 15 19V10C15 9.44772 14.5523 9 14 9H5Z" fill="currentColor"></path></svg>Copy code</button></span></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="!whitespace-pre hljs language-bash">sudo apt-get update
  sudo apt-get install python3 python3-pip
  pip3 install flask
  </code></div></div></pre>

1. **Create the Flask Application** :

- Develop a simple Flask app to handle incoming POST requests:

  <pre class="!overflow-visible"><div class="dark bg-gray-950 contain-inline-size rounded-md border-[0.5px] border-token-border-medium relative"><div class="flex items-center text-token-text-secondary bg-token-main-surface-secondary px-4 py-2 text-xs font-sans justify-between rounded-t-md h-9">python</div><div class="sticky top-9 md:top-[5.75rem]"><div class="absolute bottom-0 right-2 flex h-9 items-center"><div class="flex items-center rounded bg-token-main-surface-secondary px-2 font-sans text-xs text-token-text-secondary"><span class="" data-state="closed"><button class="flex gap-1 items-center py-1"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="icon-sm"><path fill-rule="evenodd" clip-rule="evenodd" d="M7 5C7 3.34315 8.34315 2 10 2H19C20.6569 2 22 3.34315 22 5V14C22 15.6569 20.6569 17 19 17H17V19C17 20.6569 15.6569 22 14 22H5C3.34315 22 2 20.6569 2 19V10C2 8.34315 3.34315 7 5 7H7V5ZM9 7H14C15.6569 7 17 8.34315 17 10V15H19C19.5523 15 20 14.5523 20 14V5C20 4.44772 19.5523 4 19 4H10C9.44772 4 9 4.44772 9 5V7ZM5 9C4.44772 9 4 9.44772 4 10V19C4 19.5523 4.44772 20 5 20H14C14.5523 20 15 19.5523 15 19V10C15 9.44772 14.5523 9 14 9H5Z" fill="currentColor"></path></svg>Copy code</button></span></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="!whitespace-pre hljs language-python">from flask import Flask, request
  from datetime import datetime

  app = Flask(__name__)

  @app.route('/api/log', methods=['POST'])
  def log_visit():
      data = request.json
      visitor_ip = data.get('ip')
      visit_time = data.get('time')

      # Store the data locally
      with open('visitor_logs.txt', 'a') as f:
          f.write(f'IP: {visitor_ip}, Time: {visit_time}\n')

      return 'Data logged successfully', 200

  if __name__ == '__main__':
      app.run(host='0.0.0.0', port=80)
  </code></div></div></pre>
- Save this script as `app.py` on your VPS.

1. **Run the Application** :

- Start the Flask app:
  <pre class="!overflow-visible"><div class="dark bg-gray-950 contain-inline-size rounded-md border-[0.5px] border-token-border-medium relative"><div class="flex items-center text-token-text-secondary bg-token-main-surface-secondary px-4 py-2 text-xs font-sans justify-between rounded-t-md h-9">bash</div><div class="sticky top-9 md:top-[5.75rem]"><div class="absolute bottom-0 right-2 flex h-9 items-center"><div class="flex items-center rounded bg-token-main-surface-secondary px-2 font-sans text-xs text-token-text-secondary"><span class="" data-state="closed"><button class="flex gap-1 items-center py-1"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="icon-sm"><path fill-rule="evenodd" clip-rule="evenodd" d="M7 5C7 3.34315 8.34315 2 10 2H19C20.6569 2 22 3.34315 22 5V14C22 15.6569 20.6569 17 19 17H17V19C17 20.6569 15.6569 22 14 22H5C3.34315 22 2 20.6569 2 19V10C2 8.34315 3.34315 7 5 7H7V5ZM9 7H14C15.6569 7 17 8.34315 17 10V15H19C19.5523 15 20 14.5523 20 14V5C20 4.44772 19.5523 4 19 4H10C9.44772 4 9 4.44772 9 5V7ZM5 9C4.44772 9 4 9.44772 4 10V19C4 19.5523 4.44772 20 5 20H14C14.5523 20 15 19.5523 15 19V10C15 9.44772 14.5523 9 14 9H5Z" fill="currentColor"></path></svg>Copy code</button></span></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="!whitespace-pre hljs language-bash">python3 app.py
  </code></div></div></pre>
- Ensure the app is running without errors.

### 4. Security Considerations

- **Restrict Access** : Configure your VPS's firewall to accept requests only from Cloudflare's IP ranges to prevent unauthorized access.
- **Data Validation** : Implement proper data validation and error handling in your Flask app to mitigate potential security risks.

### 5. Testing and Monitoring

- **Verify Functionality** : Access your blog and check if the visitor data is correctly logged on the VPS.
- **Monitor Logs** : Regularly monitor the logs to ensure the system is functioning as expected.

By following these steps, you can effectively track visitor information on your static blog without exposing your VPS to the public.

---

## Part 2: VPS Backend Service Configuration

In this section, you will configure a backend API service on your VPS to receive visitor information sent from the Cloudflare Worker and store it locally.

### Step 1: VPS Environment Setup

1. **Update and Install Required Software**:
   Ensure your VPS environment is up to date and that Python 3 and the Flask framework are installed. Run the following commands:

   ```bash
   sudo apt-get update
   sudo apt-get install python3 python3-pip
   pip3 install flask
   ```
2. **Open Required Ports**:
   Make sure your VPS firewall allows external access to the Flask service, typically on port 80 or any other specified port. Use the following commands to configure firewall rules that allow access only from Cloudflare’s IP ranges:

   ```bash
   sudo ufw allow from 173.245.48.0/20 to any port 80
   sudo ufw allow from 103.21.244.0/22 to any port 80
   ```

   You can add all Cloudflare IP ranges, which are available from [Cloudflare&#39;s official documentation](https://www.cloudflare.com/ips/).

### Step 2: Writing the Flask Backend API

On your VPS, create a Python file named `app.py` that will handle the incoming requests from the Cloudflare Worker and store the information.

1. **Writing the API Service Code**:

   ```python
   from flask import Flask, request
   from datetime import datetime

   app = Flask(__name__)

   @app.route('/api/log', methods=['POST'])
   def log_visit():
       data = request.json
       visitor_ip = data.get('ip')
       visit_time = data.get('time')

       # Store visitor information locally
       with open('visitor_logs.txt', 'a') as f:
           f.write(f'IP: {visitor_ip}, Time: {visit_time}\n')

       return 'Data logged successfully', 200

   if __name__ == '__main__':
       app.run(host='0.0.0.0', port=80)
   ```

   Explanation:

   - **Flask Framework**: This Flask application exposes an API endpoint at `/api/log` to receive POST requests.
   - **Data Storage**: Each time the Cloudflare Worker sends a request, the IP address and visit time are recorded in the `visitor_logs.txt` file.
   - **Running Configuration**: `host='0.0.0.0'` allows access from any address, and the default port is set to 80.
2. **Save and Run the Application**:

   Save the file as `app.py` and run it:

   ```bash
   python3 app.py
   ```

   Your Flask application should now be running on your VPS and awaiting requests from the Cloudflare Worker.

### Step 3: Deploy the Application as a Persistent Service

To ensure that the API service runs continuously on your VPS, even after a reboot, you can deploy the Flask app as a background service.

1. **Install and Configure `gunicorn`**:
   `gunicorn` is a powerful Python WSGI HTTP server that can run your Flask application:

   ```bash
   pip3 install gunicorn
   ```

   Run the application:

   ```bash
   gunicorn --bind 0.0.0.0:80 app:app
   ```

   This will run your Flask app using `gunicorn` and bind it to port 80.
2. **Use `systemd` to Make the Service Persistent**:

   Create a new `systemd` service unit file to make sure your Flask app starts automatically after a VPS reboot:

   ```bash
   sudo nano /etc/systemd/system/flaskapp.service
   ```

   Add the following content:

   ```ini
   [Unit]
   Description=Flask Application Service
   After=network.target

   [Service]
   User=your-username  # Replace with your VPS username
   WorkingDirectory=/path/to/your/app  # Replace with the directory where Flask app is located
   ExecStart=/usr/local/bin/gunicorn --workers 3 --bind 0.0.0.0:80 app:app
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

   Save the file and enable the service:

   ```bash
   sudo systemctl start flaskapp
   sudo systemctl enable flaskapp
   ```

   Now, the Flask app will run as a service in the background and will automatically restart if your VPS reboots.

### Step 4: Security Enhancements

To ensure that only requests from Cloudflare can access your VPS, you should enhance security further:

1. **Firewall Rules**: Make sure your firewall only allows requests from Cloudflare’s IP ranges:

   ```bash
   sudo ufw allow from <Cloudflare IP ranges> to any port 80
   ```

   Add all Cloudflare IP ranges to the firewall rules.
2. **API Key Validation**: You can add API key validation between Cloudflare Worker and your VPS to ensure that only valid requests are processed. Example:

   In your Cloudflare Worker:

   ```javascript
   const payload = JSON.stringify({
     ip: visitorIP,
     time: visitTime,
     api_key: "your-secret-api-key",
   });
   ```

   In your Flask backend on the VPS:

   ```python
   @app.route('/api/log', methods=['POST'])
   def log_visit():
       data = request.json
       if data.get('api_key') != 'your-secret-api-key':
           return 'Unauthorized', 401

       visitor_ip = data.get('ip')
       visit_time = data.get('time')

       with open('visitor_logs.txt', 'a') as f:
           f.write(f'IP: {visitor_ip}, Time: {visit_time}\n')

       return 'Data logged successfully', 200
   ```

   This way, only requests that include the correct API key will be processed.

### Step 5: Testing and Debugging

1. **Test the Service**: You can test the service by visiting your blog and checking the `visitor_logs.txt` file on your VPS to verify if visitor IPs and visit times are correctly logged.
2. **Monitor Logs**: Regularly monitor the VPS logs to ensure the service is functioning as expected.

---

By following these detailed steps, you can successfully use Cloudflare Workers to relay visitor information to your VPS for logging, while keeping your VPS hidden from the public. This setup is both flexible and secure, allowing for further optimization and scaling in the future.
