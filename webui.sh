#!/bin/bash
SERVICE="dhcp-hub-backend"

case "$1" in
  start)
    systemctl start $SERVICE
    echo "Web UI started"
    systemctl status $SERVICE --no-pager | grep -E 'Active:'
    ;;
  stop)
    systemctl stop $SERVICE
    echo "Web UI stopped"
    ;;
  restart)
    systemctl restart $SERVICE
    echo "Web UI restarted"
    systemctl status $SERVICE --no-pager | grep -E 'Active:'
    ;;
  status)
    systemctl status $SERVICE --no-pager | grep -E '●|Active:'
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status}"
    exit 1
    ;;
esac
