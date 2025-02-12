import { basePath, execCommand, showPrompt } from './main.js';

const overlay = document.getElementById('security-patch-overlay');
const card = document.getElementById('security-patch-card');
const advancedToggle = document.getElementById('advanced-mode');
const normalInputs = document.getElementById('normal-mode-inputs');
const advancedInputs = document.getElementById('advanced-mode-inputs');
const allPatchInput = document.getElementById('all-patch');
const bootPatchInput = document.getElementById('boot-patch');
const systemPatchInput = document.getElementById('system-patch');
const vendorPatchInput = document.getElementById('vendor-patch');
const autoButton = document.getElementById('auto-config');
const saveButton = document.getElementById('save-patch');

// Show security patch dialog
function showSecurityPatchDialog() {
    document.body.classList.add("no-scroll");
    overlay.style.display = 'block';
    card.style.display = 'block';
    setTimeout(() => {
        overlay.style.opacity = '1';
        card.style.opacity = '1';
        loadCurrentConfig();
    }, 10);
}

// Hide security patch dialog
function hideSecurityPatchDialog() {
    document.body.classList.remove("no-scroll");
    overlay.style.opacity = '0';
    card.style.opacity = '0';
    setTimeout(() => {
        overlay.style.display = 'none';
        card.style.display = 'none';
    }, 200);
}

// Function to handle security patch operation
async function handleSecurityPatch(mode, value = null) {
    if (mode === 'disable') {
        try {
            await execCommand(`
                sed -i "s/^auto_config=.*/auto_config=0/" /data/adb/security_patch
                rm -f /data/adb/tricky_store/security_patch.txt
            `);
            showPrompt('security_patch.value_empty');
            return true;
        } catch (error) {
            showPrompt('security_patch.save_failed', false);
            return false;
        }
    } else if (mode === 'manual') {
        try {
            await execCommand(`
                sed -i "s/^auto_config=.*/auto_config=0/" /data/adb/security_patch
                echo "${value}" > /data/adb/tricky_store/security_patch.txt
                chmod 644 /data/adb/tricky_store/security_patch.txt
            `);
            showPrompt('security_patch.save_success');
            return true;
        } catch (error) {
            showPrompt('security_patch.save_failed', false);
            return false;
        }
    }
}

// Load current configuration
async function loadCurrentConfig() {
    try {
        const result = await execCommand('cat /data/adb/security_patch');
        if (result) {
            const lines = result.split('\n');
            let autoConfig = '1', allValue = '0', systemValue = '0', bootValue = '0', vendorValue = '0';
            for (const line of lines) {
                if (line.startsWith('auto_config=')) {
                    autoConfig = line.split('=')[1];
                }
            }

            if (autoConfig === '1') {
                allValue = null;
                systemValue = null;
                bootValue = null;
                vendorValue = null;
                overlay.classList.add('hidden');
            } else {
                // Read values from tricky_store if auto_config is 0
                const trickyResult = await execCommand('cat /data/adb/tricky_store/security_patch.txt');
                if (trickyResult) {
                    const trickyLines = trickyResult.split('\n');
                    for (const line of trickyLines) {
                        if (line.startsWith('all=')) {
                            allValue = line.split('=')[1] || null;
                            if (allValue !== null) allPatchInput.value = allValue;
                        } else {
                            allValue = null;
                        }
                        if (line.startsWith('system=')) {
                            systemValue = line.split('=')[1] || null;
                            if (systemValue !== null) systemPatchInput.value = systemValue;
                        } else {
                            systemValue = null;
                        }
                        if (line.startsWith('boot=')) {
                            bootValue = line.split('=')[1] || null;
                            if (bootValue !== null) bootPatchInput.value = bootValue;
                        } else {
                            bootValue = null;
                        }
                        if (line.startsWith('vendor=')) {
                            vendorValue = line.split('=')[1] || null;
                            if (vendorValue !== null) vendorPatchInput.value = vendorValue;
                        } else {
                            vendorValue = null;
                        }
                    }
                }
                overlay.classList.add('hidden');
            }

            // Check if in advanced mode
            if (autoConfig === '0' && allValue === null && (bootValue || systemValue || vendorValue)) {
                advancedToggle.checked = true;
                normalInputs.classList.add('hidden');
                advancedInputs.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error('Failed to load security patch config:', error);
    }
}

// Validate date format YYYY-MM-DD
function isValidDateFormat(date) {
    if (date === 'no') return true;
    const regex = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
    return regex.test(date);
}

// Validate 6-digit format YYYYMM
function isValid6Digit(value) {
    if (value === 'prop') return true;
    const regex = /^\d{6}$/;
    return regex.test(value);
}

// Validate 8-digit format YYYYMMDD
function isValid8Digit(value) {
    const regex = /^\d{8}$/;
    return regex.test(value);
}

// Initialize event listeners
export function securityPatch() {
    document.getElementById("security-patch").addEventListener("click", showSecurityPatchDialog);

    // Toggle advanced mode
    advancedToggle.addEventListener('change', () => {
        normalInputs.classList.toggle('hidden');
        advancedInputs.classList.toggle('hidden');
    });

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            hideSecurityPatchDialog();
        }
    });

    // Auto config button
    autoButton.addEventListener('click', async () => {
        try {
            const output = await execCommand(`sh ${basePath}common/get_extra.sh --security-patch`);
            if (output.trim() === "not set") {
                showPrompt('security_patch.auto_failed', false);
            } else {
                await execCommand(`sed -i "s/^auto_config=.*/auto_config=1/" /data/adb/security_patch`);
                allPatchInput.value = '';
                systemPatchInput.value = '';
                bootPatchInput.value = '';
                vendorPatchInput.value = '';
                showPrompt('security_patch.auto_success');
            }
        } catch (error) {
            showPrompt('security_patch.auto_failed', false);
        }
        hideSecurityPatchDialog();
        loadCurrentConfig();
    });

    // Save button
    saveButton.addEventListener('click', async () => {
        if (!advancedToggle.checked) {
            // Normal mode validation
            const allValue = allPatchInput.value.trim();
            if (!allValue) {
                // Save empty value to disable auto config
                await handleSecurityPatch('disable');
                hideSecurityPatchDialog();
                return;
            }
            if (!isValid8Digit(allValue)) {
                showPrompt('security_patch.invalid_all', false);
                return;
            }
            const value = `all=${allValue}`;
            const result = await handleSecurityPatch('manual', value);
            if (result) {
                systemPatchInput.value = '';
                bootPatchInput.value = '';
                vendorPatchInput.value = '';
            }
        } else {
            // Advanced mode validation
            const bootValue = bootPatchInput.value.trim();
            const systemValue = systemPatchInput.value.trim();
            const vendorValue = vendorPatchInput.value.trim();

            if (!bootValue && !systemValue && !vendorValue) {
                // Save empty values to disable auto config
                await handleSecurityPatch('disable');
                hideSecurityPatchDialog();
                return;
            }

            if (systemValue && !isValid6Digit(systemValue)) {
                showPrompt('security_patch.invalid_system', false);
                return;
            }

            if (bootValue && !isValidDateFormat(bootValue)) {
                showPrompt('security_patch.invalid_boot', false);
                return;
            }

            if (vendorValue && !isValidDateFormat(vendorValue)) {
                showPrompt('security_patch.invalid_vendor', false);
                return;
            }

            const config = [
                systemValue ? `system=${systemValue}` : '',
                bootValue ? `boot=${bootValue}` : '',
                vendorValue ? `vendor=${vendorValue}` : ''
            ].filter(Boolean);
            const value = config.filter(Boolean).join('\n');
            const result = await handleSecurityPatch('manual', value);
            if (result) {
                allPatchInput.value = '';
            }
        }
        hideSecurityPatchDialog();
        loadCurrentConfig();
    });
}