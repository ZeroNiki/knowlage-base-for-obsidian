```shell
sudo pacman -S docker buildkit docker-buildx
```

```shell
sudo usermod -aG docker USERNAME

sudo systemctl enable docker
sudo systemctl start docker
sudo systemctl status docker
```

```shell
docker info


docker run -it --rm archlinux bash -c "echo hello world"
```