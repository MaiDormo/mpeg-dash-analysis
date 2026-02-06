#!/usr/bin/env python

import argparse
from mininet.net import Mininet
from mininet.node import Controller, OVSKernelSwitch, Host
from mininet.cli import CLI
from mininet.log import setLogLevel
from mininet.link import TCLink

def parse_arguments():
    parser = argparse.ArgumentParser(description='Network Parameters')
    parser.add_argument('-bw', type=int, required=True, help='Bandwidth')
    parser.add_argument('-delay', type=str, required=True, help='Delay')
    parser.add_argument('-loss', type=int, required=True, help='Loss')
    return parser.parse_args()

def create_network(bw, delay, loss):
    net = Mininet(topo=None, build=False, ipBase='10.0.0.0/8')
    c0 = net.addController(name='c0', controller=Controller)
    switches = [net.addSwitch(f's{i+1}', cls=OVSKernelSwitch) for i in range(2)]
    hosts = [net.addHost(f'h{i+1}', cls=Host, ip=f'10.0.0.{i+1}', defaultRoute=None) for i in range(4)]

    for i in range(2):
        net.addLink(hosts[i], switches[0], cls=TCLink)
        net.addLink(hosts[i+2], switches[1], cls=TCLink)

    net.addLink(switches[0], switches[1], cls=TCLink, bw=bw+'ms', delay=delay, loss=loss)
    net.build()

    for controller in net.controllers:
        controller.start()

    for switch in switches:
        switch.start([c0])

    CLI(net)
    net.stop()

def main():
    args = parse_arguments()
    setLogLevel('info')
    create_network(args.bw, args.delay, args.loss)

if __name__ == '__main__':
    main()
