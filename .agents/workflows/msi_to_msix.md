---
description: Extract new files from a Zeneva MSI installer and package them into an MSIX using MSIX Hero
---

Whenever a new MSI installer for Zeneva (e.g., `zeneva_3.0.1_x64_en-US.msi`) is built and downloaded, follow this automated sequence to package it into an MSIX file:

1. **Locate the MSI File**:
   Find the latest MSI file matching `zeneva_*_x64_en-US.msi` in `C:\Users\Bello Imam\Downloads`.
   Extract the version number from the file name (e.g., `3.0.1` from `zeneva_3.0.1_x64_en-US.msi`).

2. **Extract the MSI (Quiet Mode)**:
   Extract the compiled binaries (like `app.exe`) to a temporary folder (`ZenevaExtract`) without opening any installation wizards:
   ```powershell
   Start-Process msiexec.exe -ArgumentList '/a "C:\Users\Bello Imam\Downloads\zeneva_VERSION_x64_en-US.msi" /qn TARGETDIR="C:\Users\Bello Imam\Downloads\ZenevaExtract"' -NoNewWindow -Wait
   ```
   *(Replace `VERSION` with the version found in step 1, e.g., `3.0.1`)*

3. **Update the MSIX Packing Folder**:
   Copy the newly extracted `app.exe` into the packaging directory, replacing the old build:
   ```powershell
   Copy-Item -Path "C:\Users\Bello Imam\Downloads\ZenevaExtract\PFiles\zeneva\app.exe" -Destination "C:\Users\Bello Imam\Downloads\ZenevaPack\app.exe" -Force
   ```

4. **Clean Up Temporary Extraction Files**:
   Remove the temporary folder created in step 2:
   ```powershell
   Remove-Item -Path "C:\Users\Bello Imam\Downloads\ZenevaExtract" -Recurse -Force
   ```

5. **Update Version in Manifest (Optional)**:
   If the version has changed, update the version attribute in the `<Identity>` element within `C:\Users\Bello Imam\Downloads\ZenevaPack\AppxManifest.xml` (e.g. `Version="3.0.1.0"`).

6. **Pack the Folder to MSIX**:
   Run MSIX Hero CLI to compile the package:
   ```powershell
   MSIXHeroCLI.exe pack -d "C:\Users\Bello Imam\Downloads\ZenevaPack" -p "C:\Users\Bello Imam\Downloads\ZenevaPack_VERSION.msix"
   ```
   *(Replace `VERSION` with the current version, e.g., `3.0.1`)*

7. **Sign the MSIX Package**:
   To make the generated MSIX package installable on Windows, sign it using your certificate via the MSIX Hero GUI:
   - Go to **Tools** > **Sign package**.
   - Select the generated `.msix` file.
   - Choose your code signing certificate and click sign.
