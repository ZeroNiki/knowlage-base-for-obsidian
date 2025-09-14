## Основные блоки
`Vagrantfile` - это Ruby файл. Пример:
```ruby
Vagrant.configure("2") do |config|
  # 1) box — базовый образ
  config.vm.box = "hashicorp/bionic64"

  # 2) имя хоста внутри VM
  config.vm.hostname = "devbox"

  # 3) сеть: приватная с фиксированным IP
  config.vm.network "private_network", ip: "192.168.56.10"

  # 4) проброс порта (guest 80 -> host 8080)
  config.vm.network "forwarded_port", guest: 80, host: 8080

  # 5) синхронизация папки проекта (host -> guest)
  config.vm.synced_folder ".", "/vagrant", type: "virtualbox"

  # 6) опции провайдера (здесь — VirtualBox)
  config.vm.provider "virtualbox" do |vb|
    vb.memory = "2048"
    vb.cpus = 2
  end

  # 7) provisioner — простой shell (инлайн)
  config.vm.provision "shell", inline: <<-SHELL
    sudo apt-get update
    sudo apt-get install -y nginx
    sudo systemctl enable nginx
  SHELL
end
```

### Примеры практического провижининга
