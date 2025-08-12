---
title: "Building a HomeLab Kubernetes Cluster: A Feasible Plan for R610s, an MD3100, and a MikroTik Router"
date: 2025-10-06T08:00:00-06:00
publishDate: 2025-10-06T10:00:00-06:00
description: "A realistic, step-by-step plan to stand up a small-but-solid Kubernetes lab on two Dell R610s with an MD3100, fronted by a MikroTik CRS326."
categories:
  - projects
  - learning
tags:
  - Kubernetes
  - Home Lab
  - MikroTik
  - RouterOS
  - Terraform
  - Storage
menu:
  sidebar:
    name: "Home Lab Kubernetes"
    identifier: home-lab-k8s
    parent: homelab
---

I want a clear, publishable plan that I can follow and update over time. This is not a victory lap or a lessons-learned post. It is a feasible roadmap that fits my actual hardware and network.

## Current hardware and network

**Servers**

| Name     | Model  | CPUs                         | RAM   | System Disk   | Notes                                                                      |
| -------- | ------ | ---------------------------- | ----- | ------------- | -------------------------------------------------------------------------- |
| Sonic    | R610   | 2 × Intel E5640 (4c/8t each) | 96 GB | 1 TB SATA SSD | iDRAC available                                                            |
| Rhuidean | R610   | 2 × Intel E5640 (4c/8t each) | 48 GB | —             | Planned storage head, iDRAC available                                      |
| Captain  | MD3100 | external DAS, 15 × 750 GB    | —     | —             | 11.25 TB raw; will be RAID 6 (13 data + 2 hot spares) for \~8.25 TB usable |

**Networking**

* Core router/switch: **MikroTik CRS326-24G-2S+** (RouterOS, managed via Terraform).
* ISP CPE: **Nokia Beacon G6** in bridge mode, Wi-Fi disabled.
* Temporary Wi-Fi: **Netgear Orbi RBR750 + satellites**. Future plan is **hAP ax²** and **cAP ax** managed by **CAPsMAN** on MikroTik.
* VLAN-aware bridging on CRS326 with DHCP, firewall, and NAT handled by MikroTik.

## Target architecture

* **Kubernetes:** k3s for low overhead.
* **Control plane:** Sonic (control-plane + worker).
* **Worker:** Rhuidean (worker) while also serving storage.
* **Persistent storage for K8s:** NFS exports from Rhuidean backed by Captain (MD3100) RAID 6. Start simple with NFS; consider Longhorn later if I add a third node with direct disks.
* **Ingress:** Traefik (default in k3s), TLS via internal CA first, public TLS later.
* **Observability:** kube-prometheus-stack when basic apps are running.
* **Backups:** Velero to S3-compatible storage.

```
[Internet]
    |
[ISP ONT]
    |
[MikroTik CRS326] === VLAN trunk === [Sonic R610]
        \________ VLAN trunk ________ [Rhuidean R610] --- [Captain MD3100]
                              \
                               \-- APs (Beacon (bridge), Orbi short-term, hAP/cAP later via CAPsMAN)
```

## Phased plan

### Phase 0: Rack, cabling, and power

* Mount Sonic, Rhuidean, and Captain. Label everything.
* Dual-home servers to CRS326 if possible for LACP later.
* Verify iDRAC access and firmware health on both R610s.
* Optional but recommended: a small UPS per rack section.

**Exit criteria**

* Both R610s reachable via iDRAC and SSH from the management VLAN.
* MD3100 visible to Rhuidean via the appropriate HBA and cabling.

### Phase 1: MikroTik network baseline (Terraform)

Define these VLANs and subnets:

| VLAN | Name       | CIDR            | Purpose                            |
| ---- | ---------- | --------------- | ---------------------------------- |
| 10   | Management | 192.168.10.0/24 | iDRAC, switches, router            |
| 20   | Servers    | 192.168.20.0/24 | R610 OS, NFS, K8s nodes            |
| 30   | Storage    | 192.168.30.0/24 | NFS/iSCSI traffic (server-only)    |
| 40   | K8s-Pods   | 192.168.40.0/24 | optional pod network if needed     |
| 41   | K8s-Svcs   | 192.168.41.0/24 | LoadBalancer IPs via MetalLB later |
| 50   | Wired-Home | 192.168.50.0/24 | Desktops, Consoles, wired clients, printers  |
| 55   | Media-IoT  | 192.168.55.0/24 | TVs, streaming sticks; restricted east-west |
| 60   | Wi-Fi      | 192.168.60.0/24 | APs and clients (CAPsMAN later)    |

Rules of thumb

* Allow Management to reach everywhere.
* Allow Servers ↔ Storage.
* Block Wi-Fi from reaching Management.
* NAT to ISP on WAN interface.

**Exit criteria**

* DHCP on Wi-Fi, static or DHCP reservations on Servers and Management.
* VLAN trunk to each R610 with tagged 10, 20, 30.

### Phase 2: Base OS on servers

* Install **Ubuntu Server 24.04 LTS** on Sonic and Rhuidean.
* Assign static IPs from Servers VLAN. Add a Storage VLAN sub-interface on Rhuidean for NFS.
* Tune basics: `chrony`, `unattended-upgrades`, `tuned` or simple CPU governor settings.
* Configure SSH keys and a shared admin group.

**Exit criteria**

* Sonic and Rhuidean are reachable on 20.x with correct hostnames.
* Basic monitoring: node exporter or at least `prometheus-node-exporter` installed.

### Phase 3: Captain storage on Rhuidean

* Create **RAID 6** virtual disk on MD3100 with **13 drives** and **2 hot spares**.
* On Rhuidean, create a single **LVM + ext4** or **XFS** filesystem on the RAID LUN for simplicity.
* Export **NFS** shares for K8s:

  * `/srv/nfs/k8s-pv-general`
  * `/srv/nfs/k8s-pv-logs`
* Restrict exports to Servers VLAN. Jumbo frames optional after end-to-end MTU validation.

**Exit criteria**

* `showmount -e` from Sonic sees the exports.
* Basic throughput tests over the Storage VLAN meet expectations.

### Phase 4: k3s install

On **Sonic** (control-plane):

```bash
curl -sfL https://get.k3s.io | \
  INSTALL_K3S_EXEC="--disable=servicelb --write-kubeconfig-mode 644" sh -
# Save the node token
sudo cat /var/lib/rancher/k3s/server/node-token
```

On **Rhuidean** (worker):

```bash
export K3S_URL=https://<sonic-ip>:6443
export K3S_TOKEN=<token-from-sonic>
curl -sfL https://get.k3s.io | sh -
```

Verify:

```bash
kubectl get nodes -o wide
```

**Exit criteria**

* Both nodes Ready.
* Traefik is installed and exposing a test `Ingress`.

### Phase 5: Persistent storage in Kubernetes (NFS provisioner)

Create an **NFS StorageClass** that points to Rhuidean.

`nfs-sc.yaml`:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-csi
provisioner: nfs.csi.k8s.io
parameters:
  server: <rhuidean-servers-vlan-ip>
  share: /srv/nfs/k8s-pv-general
reclaimPolicy: Delete
mountOptions:
  - nfsvers=4.1
allowVolumeExpansion: true
volumeBindingMode: Immediate
```

Install the NFS CSI driver (use the upstream manifests), then:

```bash
kubectl apply -f nfs-sc.yaml
kubectl patch storageclass nfs-csi -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

**Exit criteria**

* A `PersistentVolumeClaim` binds using `nfs-csi`.
* A test Deployment can write to a mounted volume and survive pod reschedules.

### Phase 6: Ingress, DNS, and internal TLS

* Create an internal zone like `lab.local` on MikroTik or your DNS server.
* Point `*.lab.local` to a MetalLB address in 41.x if you add MetalLB, otherwise start with NodePort for testing.
* For TLS, start with a simple internal CA using `mkcert` or step-ca. Public certificates can come later.

**Exit criteria**

* `hello.lab.local` routes through Traefik to a sample service with HTTPS.

### Phase 7: Observability and logging

* Deploy **kube-prometheus-stack** via Helm.
* Add node exporter, kube-state-metrics, and a basic Grafana dashboard.
* For logs, start with **Loki** and **Promtail**.
* Alerting via **Alertmanager** to email or a chat webhook.

**Exit criteria**

* Grafana shows CPU, RAM, disk, and k8s health for both nodes.
* A synthetic alert fires and reaches the destination.

### Phase 8: CI/CD

* Container registry: **GitHub Container Registry**.
* GitHub Actions workflow to build, scan, and push images. Simple `kubectl apply` or Helm release on tag.

`.github/workflows/build.yml` (skeleton):

```yaml
name: build-and-push
on:
  push:
    branches: [ main ]
    paths: [ "apps/**", ".github/workflows/build.yml" ]
jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Build and push
        run: |
          IMAGE=ghcr.io/${{ github.repository }}/hello-api:$(git rev-parse --short HEAD)
          docker build -t $IMAGE apps/hello-api
          docker push $IMAGE
```

**Exit criteria**

* Pushing to `main` produces a new image in GHCR and updates a test deployment.

### Phase 9: Backups and recovery

* **Velero** to S3 or Backblaze B2 for cluster resources and PV data that lives on NFS.
* Snapshot schedule on Rhuidean for the NFS filesystem using LVM snapshots or filesystem-level snapshots if supported.
* Quarterly restore drill.

**Exit criteria**

* A sample namespace can be backed up and restored to a clean cluster.

### Phase 10: Hardening and quality of life

* Restrict SSH by VLAN and key-only auth.
* Pod Security Standards set to baseline or restricted.
* Resource requests/limits on default namespaces to avoid noisy neighbor issues on older CPUs.
* Power and noise: define quiet hours, fan profiles if available, and a monthly dust clean.

## Initial app list

* `hello-api` demo
* Uptime-Kuma for internal status pages
* A private container registry mirror (optional)
* A small Postgres for testing with a PVC on NFS

## Risks and mitigations

* **Two physical nodes only.** Control-plane relies on Sonic. Mitigation: frequent etcd snapshots and a documented restore runbook. Consider a small third node later for HA.
* **Old CPUs.** E5640s are fine for a lab but set conservative resource limits and avoid heavy stacks like full Ceph.
* **Single storage head.** Rhuidean is a single point for NFS. Keep good backups and a tested plan to reattach MD3100 to Sonic if needed.

## Acceptance checklist for “v1”

* [ ] VLANs, DHCP, and firewall policies live on MikroTik
* [ ] Rhuidean exports NFS backed by Captain RAID 6
* [ ] Sonic runs k3s control-plane; Rhuidean joins as worker
* [ ] Default StorageClass via NFS CSI
* [ ] Traefik ingress with internal DNS and TLS
* [ ] Grafana dashboards and a working alert
* [ ] CI pipeline builds and deploys a sample app
* [ ] Velero backup and a documented restore

---

When I reach v1, I will reassess whether to:

* Add a third low-power node for HA control-plane.
* Replace Orbi with hAP ax² and cAP ax under CAPsMAN.
* Introduce MetalLB and external-dns for cleaner service IPs and records.
* Experiment with Longhorn if I add local SSDs to each node.

This plan is meant to be lived in. I will update it as I iterate.
