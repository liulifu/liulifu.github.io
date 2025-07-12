# How to build your own DeepSite

   

>Building your own DeepSite instance on Hugging Face Spaces and integrating a custom AI model like DeepSeek V3 involves several steps, from setting up the environment to configuring the model and handling API keys. Below is a step-by-step guide based on available information, including how to manage API keys or alternative methods to connect DeepSite to your AI model. Since DeepSeek V3 is a massive model (671B parameters), running it locally or on Hugging Face may require significant resources or quantization for consumer-grade hardware. I'll also address how to increase usage caps and reduce limits by hosting your own instance.



### **Step-by-Step Guide to Build DeepSite with a Custom AI Model like DeepSeek V3**

#### **1. Understand DeepSite and DeepSeek V3 Requirements**
- **DeepSite Overview**: DeepSite is an open-source platform hosted on Hugging Face Spaces (e.g., `enzostvs/deepsite`) that generates websites from text prompts using the DeepSeek V3 model. It runs in a browser, producing HTML, CSS, and JavaScript without relying on predefined templates.[](https://medium.com/%40mathur.danduprolu/deepsite-by-hugging-face-how-ai-is-transforming-app-development-in-2025-9f8da0b13287)[](https://apidog.com/blog/deepsite/)
- **DeepSeek V3 Specs**: DeepSeek V3 is a 671B-parameter Mixture-of-Experts (MoE) model, with 37B active parameters per token, optimized for coding and web development. It requires substantial hardware (e.g., 80GB*8 GPUs for BF16 inference) unless quantized. Hugging Face’s Transformers library isn’t directly supported yet, but alternatives like vLLM or custom inference scripts are available.[](https://huggingface.co/deepseek-ai/DeepSeek-V3)[](https://github.com/deepseek-ai/DeepSeek-V3)
- **Hosting on Hugging Face Spaces**: By creating your own Space, you can customize DeepSite’s code, integrate your own model, and potentially increase usage limits (depending on your Hugging Face plan). Free Spaces have resource limits (e.g., CPU/GPU quotas), but paid plans (e.g., Pro or Enterprise) offer higher caps.[](https://huggingface.co/spaces/enzostvs/deepsite/discussions/74)

#### **2. Clone or Fork DeepSite Repository**
- **Locate DeepSite Source**: The official DeepSite Space is at `https://huggingface.co/spaces/enzostvs/deepsite`. The codebase is open-source, and you can find it on GitHub (e.g., `https://github.com/MartinsMessias/deepsite-locally` for local setups, though the main repo may be linked in the Space).[](https://huggingface.co/spaces/enzostvs/deepsite/discussions/74)[](https://huggingface.co/spaces/enzostvs/deepsite)
- **Fork or Clone**:
  - **On Hugging Face**: Go to `enzostvs/deepsite`, click the three dots in the top-right corner, and select “Duplicate this Space” to create your own copy. This requires a Hugging Face account (free or paid).
  - **On GitHub**: If you want to modify the code locally first, clone the repository:
    ```bash
    git clone https://github.com/MartinsMessias/deepsite-locally.git
    ```
    Check for the official DeepSite repo in the Hugging Face Space’s “Files” tab if it’s not the above.
- **Why Fork?**: Forking lets you customize the code, integrate your model, and deploy it under your own Space, giving you control over quotas and configurations.

#### **3. Set Up DeepSeek V3 Model**
- **Download DeepSeek V3**:
  - DeepSeek V3 is available on Hugging Face at `deepseek-ai/DeepSeek-V3`. The model weights total 685B (671B main + 14B Multi-Token Prediction module).[](https://huggingface.co/deepseek-ai/DeepSeek-V3)[](https://github.com/deepseek-ai/DeepSeek-V3)
  - Clone the DeepSeek V3 repository for setup instructions:
    ```bash
    git clone https://github.com/deepseek-ai/DeepSeek-V3.git
    ```
  - Install dependencies:
    ```bash
    cd DeepSeek-V3/inference
    pip install -r requirements.txt
    ```
  - Download model weights from Hugging Face (`deepseek-ai/DeepSeek-V3`) and place them in `/path/to/DeepSeek-V3`. This requires ~685GB of disk space.[](https://github.com/deepseek-ai/DeepSeek-V3)
- **Quantize for Consumer Hardware (Optional)**:
  - DeepSeek V3 is resource-intensive. For systems with limited hardware (e.g., <48GB RAM), use quantized versions (2-bit to 8-bit) available via Unsloth or other tools. Minimum requirements for 2-bit quantization are 48GB RAM and 250GB disk space.[](https://x.com/UnslothAI/status/1876729710790815872)
  - Example quantization setup (using Unsloth):
    ```bash
    pip install unsloth
    # Follow Unsloth’s guide to quantize DeepSeek-V3 to 4-bit or 2-bit
    ```
    See Unsloth’s documentation for details: `https://github.com/unslothai/unsloth`.[](https://www.datacamp.com/tutorial/fine-tuning-deepseek-r1-reasoning-model)
- **Convert Weights (Optional)**:
  - DeepSeek V3 uses FP8 weights by default. For BF16 (better for some hardware), convert using the provided script:
    ```bash
    cd DeepSeek-V3/inference
    python fp8_cast_bf16.py --input-fp8-hf-path /path/to/fp8_weights --output-bf16-hf-path /path/to/bf16_weights
    ```
   [](https://huggingface.co/deepseek-ai/DeepSeek-V3)[](https://github.com/deepseek-ai/DeepSeek-V3)
- **Local Testing**:
  - Test DeepSeek V3 locally using the provided inference script:
    ```bash
    torchrun --nnodes 1 --nproc-per-node 8 generate.py --ckpt-path /path/to/DeepSeek-V3 --config configs/config_671B.json --interactive --temperature 0.7 --max-new-tokens 200
    ```
    Adjust `--nnodes` and `--nproc-per-node` based on your hardware.[](https://github.com/deepseek-ai/DeepSeek-V3)

#### **4. Configure DeepSite to Use Your DeepSeek V3 Model**
- **Modify DeepSite’s Backend**:
  - DeepSite’s default setup uses DeepSeek V3-0324 via a remote API or hosted model. To use your own model, you need to modify the backend to point to your local or hosted DeepSeek V3 instance.
  - Open DeepSite’s source code (in your cloned repo or Space’s `Files` tab). Look for files handling model inference (likely in Python, e.g., `app.py` or `main.py`).
  - Replace the default model call with your DeepSeek V3 instance. For example, if using vLLM for inference:
    ```python
    from vllm import LLM, SamplingParams
    model_name = "/path/to/DeepSeek-V3"  # Local path or Hugging Face model ID
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    llm = LLM(model=model_name, tensor_parallel_size=8, max_model_len=8192, trust_remote_code=True)
    sampling_params = SamplingParams(temperature=0.3, max_tokens=256, stop_token_ids=[tokenizer.eos_token_id])
    ```
    This code loads your local DeepSeek V3 model. Adjust `tensor_parallel_size` and `max_model_len` based on your hardware.[](https://huggingface.co/deepseek-ai/DeepSeek-V2.5)
- **Local Model Integration**:
  - If running DeepSeek V3 locally, ensure DeepSite’s backend can access the model via a local server. Use tools like Ollama or LM Studio to host DeepSeek V3 locally and expose it via an API endpoint.[](https://huggingface.co/spaces/enzostvs/deepsite/discussions/74)
  - Example with Ollama:
    - Install Ollama: `curl https://ollama.ai/install.sh | sh`
    - Load DeepSeek V3 (quantized): `ollama run deepseek-v3`
    - Update DeepSite’s code to query `http://localhost:11434/api/generate` for model responses.
- **Hosted Model on Hugging Face**:
  - If hosting DeepSeek V3 on your own Hugging Face Space, upload the model weights to a private or public repository (e.g., `your-username/DeepSeek-V3-Custom`).
  - Configure DeepSite to load the model from this repository using Hugging Face’s API or vLLM.

#### **5. Configure API Key or Alternative Connection Method**
- **Using DeepSeek API (Optional)**:
  - DeepSeek offers an API for V3, which can be used instead of local hosting to reduce resource demands. Visit `https://x.ai/api` for API access details (note: xAI’s API page is referenced, but DeepSeek’s official API is at `https://platform.deepseek.com/docs/api`).[](https://huggingface.co/deepseek-ai/DeepSeek-V3)
  - Sign up for an API key at `https://platform.deepseek.com`.
  - In DeepSite’s code, configure the API client to use your key. Example:
    ```python
    import requests
    API_KEY = "your-deepseek-api-key"
    headers = {"Authorization": f"Bearer {API_KEY}"}
    response = requests.post("https://api.deepseek.com/v3/generate", json={"prompt": "your prompt"}, headers=headers)
    ```
    Add this logic to DeepSite’s model inference function.
  - Store the API key securely in a `.env` file:
    ```bash
    # In DeepSite folder, create .env
    DEEPSEEK_API_KEY=your-deepseek-api-key
    ```
    Load it in Python:
    ```python
    from dotenv import load_dotenv
    import os
    load_dotenv()
    API_KEY = os.getenv("DEEPSEEK_API_KEY")
    ```
- **Hugging Face Inference API**:
  - If hosting DeepSeek V3 on a Hugging Face Space, generate a Hugging Face token with inference permissions:
    - Go to `https://huggingface.co/settings/tokens/new?ownUserPermissions=repo.content.read&ownUserPermissions=repo.write&ownUserPermissions=inference.serverless.edit`.
    - Create a fine-grained token and copy it.
    - Store it in DeepSite’s `.env` file:
      ```bash
      HUGGINGFACE_TOKEN=your-hf-token
      ```
    - Update DeepSite’s code to use the Hugging Face Inference API:
      ```python
      from huggingface_hub import InferenceClient
      client = InferenceClient(token=os.getenv("HUGGINGFACE_TOKEN"))
      output = client.text_generation("your prompt", model="your-username/DeepSeek-V3-Custom")
      ```
     [](https://huggingface.co/spaces/enzostvs/deepsite/discussions/74)
- **Local Model (No API Key)**:
  - If running DeepSeek V3 locally via vLLM or Ollama, no API key is needed. DeepSite communicates directly with the local server (e.g., `http://localhost:8000` for vLLM). Update the backend to point to this endpoint.

#### **6. Deploy Your Custom DeepSite on Hugging Face Spaces**
- **Create a New Space**:
  - Go to `https://huggingface.co/spaces` and click “Create new Space.”
  - Choose a name (e.g., `your-username/MyDeepSite`).
  - Select “Docker” or “Python” as the Space type (Docker is recommended for complex setups).
- **Upload Modified Code**:
  - Push your modified DeepSite code to the Space’s repository:
    ```bash
    cd deepsite-locally
    git add .
    git commit -m "Custom DeepSite with DeepSeek V3"
    git push origin main
    ```
  - Alternatively, upload files directly via the Hugging Face Space’s web interface.
- **Configure Space Settings**:
  - In the Space’s “Settings” tab, add environment variables for API keys:
    - `DEEPSEEK_API_KEY=your-deepseek-api-key`
    - `HUGGINGFACE_TOKEN=your-hf-token`
  - If using a local model, ensure the Space has enough GPU resources (upgrade to a paid plan if needed).
- **Build and Run**:
  - Hugging Face will automatically build and deploy your Space. Monitor the build logs for errors.
  - Once running, access your DeepSite at `https://huggingface.co/spaces/your-username/MyDeepSite`.

#### **7. Increase Caps and Reduce Limits**
- **Hugging Face Free Tier Limitations**:
  - Free Spaces have limited CPU/GPU hours and storage. DeepSeek V3’s size (685GB) may exceed free tier limits, and inference is slow without GPUs.[](https://huggingface.co/spaces/enzostvs/deepsite/discussions/74)
- **Upgrade to Paid Plan**:
  - Hugging Face Pro ($9/month) or Enterprise plans offer higher quotas, persistent storage, and GPU access (e.g., A100 or H100). Check `https://huggingface.co/pricing` for details.
  - Paid plans allow longer runtime, more concurrent users, and faster inference, reducing limits compared to the public `enzostvs/deepsite` Space.
- **Local Hosting Alternative**:
  - To avoid cloud limits entirely, host DeepSite and DeepSeek V3 on your own server:
    - Use Docker for easy setup:
      ```bash
      docker pull martinsmessias/deepsite-locally
      docker run -p 8000:8000 -v /path/to/DeepSeek-V3:/models martinsmessias/deepsite-locally
      ```
    - Ensure your server has sufficient RAM (48GB+ for quantized models) and GPUs (e.g., 80GB*8 for full model).[](https://huggingface.co/spaces/enzostvs/deepsite/discussions/74)
  - Access DeepSite at `http://localhost:8000` or your server’s IP.
- **Optimize Model Usage**:
  - Use quantized models (e.g., 4-bit) to reduce memory needs.
  - Implement batch processing in DeepSite’s backend to handle multiple prompts efficiently, reducing API or inference calls.

#### **8. Test and Refine**
- **Test Your DeepSite**:
  - Open your Space or local instance and enter a prompt (e.g., “Create a portfolio website with a dark theme”).
  - Verify the generated HTML, CSS, and JavaScript in the preview panel.
  - Check for errors in model responses or rendering.
- **Refine Prompts**:
  - DeepSeek V3 performs best with clear, detailed prompts. Example: “Generate a responsive e-commerce website with TailwindCSS, a sticky navbar, and product cards.”[](https://www.scriptbyai.com/website-generator-deepseek/)
- **Debug Issues**:
  - If the model fails to load, check memory usage and quantization settings.
  - If API calls fail, verify your API key and endpoint configuration.
  - Consult DeepSite’s GitHub issues or DeepSeek’s support (`service@deepseek.com`).[](https://huggingface.co/deepseek-ai/DeepSeek-V2.5)

---

### **Where to Configure API Key or Connect DeepSite to AI Model**
- **API Key Configuration**:
  - **DeepSeek API**: Store in `.env` as `DEEPSEEK_API_KEY` and load in DeepSite’s backend code (see Step 5). Alternatively, set in Hugging Face Space’s “Settings” > “Environment Variables.”
  - **Hugging Face Inference API**: Store in `.env` as `HUGGINGFACE_TOKEN` or set in Space settings.[](https://huggingface.co/spaces/enzostvs/deepsite/discussions/74)
- **Local Model Connection**:
  - No API key is needed. Modify DeepSite’s backend to query your local server (e.g., `http://localhost:8000` for vLLM or `http://localhost:11434` for Ollama). Update the model endpoint in the inference function (e.g., `app.py`).
- **Hosted Model on Hugging Face**:
  - Upload DeepSeek V3 to your repository (`your-username/DeepSeek-V3-Custom`).
  - Configure DeepSite to load the model using Hugging Face’s InferenceClient or vLLM, authenticated with your Hugging Face token.

---

### **Additional Tips**
- **Community Resources**:
  - Join Hugging Face’s Discord or DeepSite’s GitHub discussions for support.[](https://huggingface.co/spaces/enzostvs/deepsite/discussions/74)
  - Check X posts for user tips (e.g., `@Thom_Wolf` announced DeepSite’s capabilities).[](https://x.com/Thom_Wolf/status/1906299093518848103)
- **Performance Optimization**:
  - Use DeepSeek V3’s Multi-Token Prediction (MTP) for faster inference if supported by your setup.[](https://huggingface.co/deepseek-ai/DeepSeek-V3)
  - Set temperature to 0.3–0.6 for coherent outputs (recommended by DeepSeek).[](https://huggingface.co/deepseek-ai/DeepSeek-R1)
- **Scaling Up**:
  - If you hit usage caps, consider DeepSeek’s enterprise API or hosting on AWS/GCP with high-end GPUs (e.g., NVIDIA H100).[](https://github.com/deepseek-ai/awesome-deepseek-integration)
- **Backup Code**:
  - Regularly save generated code, as DeepSite doesn’t autosave. Export via the “Download” button or copy from the editor.[](https://huggingface.co/blog/LLMhacker/deepsite)

---

### **Summary**
To build your own DeepSite on Hugging Face with DeepSeek V3:
1. Fork `enzostvs/deepsite` or clone its GitHub repo.
2. Set up DeepSeek V3 locally (quantized for lower resources) or host it on Hugging Face.
3. Modify DeepSite’s backend to use your model (local, API, or Hugging Face-hosted).
4. Configure API keys in `.env` or Space settings for DeepSeek/Hugging Face APIs, or use local endpoints for direct model access.
5. Deploy to a new Hugging Face Space and upgrade to a paid plan for higher caps.
6. Test and refine your setup for optimal performance.

For detailed pricing on Hugging Face plans, visit `https://huggingface.co/pricing`. For DeepSeek API details, see `https://platform.deepseek.com/docs/api`. If you need help with specific code changes or hardware setup, let me know![](https://huggingface.co/deepseek-ai/DeepSeek-V3)