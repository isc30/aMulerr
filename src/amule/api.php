<?php
    switch ($_GET["get"]) {
        case "categories":
            $categories = amule_get_categories();
            echo "{";
            foreach($categories as $index => $category) {
                if ($index > 0) { echo ","; }
                echo '"'.$category.'":'.$index;
            }
            echo "}";
            break;
        case "stats":
            $stats = amule_get_stats();
            echo "{";
            echo '"id":'.num_value($stats["id"]).',';
            echo '"serv_addr":'.str_value($stats["serv_addr"]).',';
            echo '"serv_name":'.str_value($stats["serv_name"]).',';
            echo '"serv_users":'.num_value($stats["serv_users"]).',';
            echo '"kad_connected":'.bool_value($stats["kad_connected"] == "1").',';
            echo '"kad_firewalled":'.bool_value($stats["kad_firewalled"] == "1").',';
            echo '"speed_up":'.num_value($stats["speed_up"]).',';
            echo '"speed_down":'.num_value($stats["speed_down"]).',';
            echo '"speed_limit_up":'.num_value($stats["speed_limit_up"]).',';
            echo '"speed_limit_down":'.num_value($stats["speed_limit_down"]);
            echo "}";
            break;
        case "options":
            echo_array(amule_get_options());
            break;
        case "downloads":
            $arr = amule_load_vars("downloads");
            echo "[";
            foreach ($arr as $index => $item) {
                if ($index > 0) { echo ","; }
                echo "{";
                echo '"name":"'.$item->name.'",';
                echo '"short_name":"'.$item->short_name.'",';
                echo '"hash":"'.$item->hash.'",';
                echo '"link":"'.$item->link.'",';
                echo '"category":'.$item->category.',';
                echo '"status":'.$item->status.',';
                echo '"size":'.$item->size.',';
                echo '"size_done":'.$item->size_done.',';
                echo '"size_xfer":'.$item->size_xfer.',';
                echo '"speed":'.$item->speed.',';
                echo '"src_count":'.$item->src_count.',';
                echo '"src_count_not_curr":'.$item->src_count_not_curr.',';
                echo '"src_count_a4af":'.$item->src_count_a4af.',';
                echo '"src_count_xfer":'.$item->src_count_xfer.',';
                echo '"prio":'.$item->prio.',';
                echo '"prio_auto":'.$item->prio_auto.',';
                echo '"last_seen_complete":'.$item->last_seen_complete;
                echo "}";
            }
            echo "]";
            break;
        case "uploads":
            $arr = amule_load_vars("uploads");
            echo "[";
            foreach ($arr as $index => $item) {
                if ($index > 0) { echo ","; }
                echo "{";
                echo '"name":"'.$item->name.'",';
                echo '"short_name":"'.$item->short_name.'",';
                echo '"xfer_up":'.$item->xfer_up.',';
                echo '"xfer_down":'.$item->xfer_down.',';
                echo '"xfer_speed":'.$item->xfer_speed;
                echo "}";
            }
            echo "]";
            break;
        case "shared":
            $arr = amule_load_vars("shared");
            echo "[";
            foreach ($arr as $index => $item) {
                if ($index > 0) { echo ","; }
                echo "{";
                echo '"name":"'.$item->name.'",';
                echo '"short_name":"'.$item->short_name.'",';
                echo '"hash":"'.$item->hash.'",';
                echo '"size":'.$item->size.',';
                echo '"link":"'.$item->link.'",';
                echo '"xfer":'.$item->xfer.',';
                echo '"xfer_all":'.$item->xfer_all.',';
                echo '"req":'.$item->req.',';
                echo '"req_all":'.$item->req_all.',';
                echo '"accept":'.$item->accept.',';
                echo '"accept_all":'.$item->accept_all.',';
                echo '"prio":'.$item->prio.',';
                echo '"prio_auto":'.$item->prio_auto;
                echo "}";
            }
            echo "]";
            break;
        case "searchresult":
            $arr = amule_load_vars("searchresult");
            echo "[";
            foreach ($arr as $index => $item) {
                if ($index > 0) { echo ","; }
                echo "{";
                echo '"name":"'.$item->name.'",';
                echo '"short_name":"'.$item->short_name.'",';
                echo '"hash":"'.$item->hash.'",';
                echo '"size":'.$item->size.',';
                echo '"sources":'.$item->sources.',';
                echo '"present":'.$item->present;
                echo "}";
            }
            echo "]";
            break;
        case "servers":
            $arr = amule_load_vars("servers");
            echo "[";
            foreach ($arr as $index => $item) {
                if ($index > 0) { echo ","; }
                echo "{";
                echo '"name":"'.$item->name.'",';
                echo '"desc":"'.$item->desc.'",';
                echo '"addr":"'.$item->addr.'",';
                echo '"users":'.$item->users.',';
                echo '"ip":"'.$item->ip.'",';
                echo '"port":'.$item->port.',';
                echo '"maxusers":'.$item->maxusers.',';
                echo '"files":'.$item->files;
                echo "}";
            }
            echo "]";
            break;
        case "version":
            echo amule_get_version();
            break;
    }

    switch ($_GET["do"]) {
        case "search":
            $q = $_GET["q"];
            $ext = $_GET["ext"];
            $searchType = $_GET["searchType"];
            $minSize = $_GET["minSize"];
            amule_do_search_start_cmd($q, $ext, "", $searchType, "", $minSize, 0);
            echo '{}';
            break;
        case "download":
            $cat = amule_get_categories();
            $link = $_GET["link"];
            $category = $_GET["category"];
            amule_do_ed2k_download_cmd($link, $category);
            echo '{}';
            break;
        case "cancel":
            $hash = get_valid_download_hash();
            amule_do_download_cmd($hash, 'cancel');
            echo '{}';
            break;
        case "resume":
            $hash = get_valid_download_hash();
            amule_do_download_cmd($hash, 'resume');
            echo '{}';
            break;
        case "pause":
            $hash = get_valid_download_hash();
            amule_do_download_cmd($hash, 'pause');
            echo '{}';
            break;
        case "reload-shared":
            amule_do_reload_shared_cmd();
            echo '{}';
            break;
        case "reconnect":
            echo '{ TODO: 1 }';
            break;
    }

    function get_valid_download_hash() {
        if (!isset($_GET["hash"]) || !is_string($_GET["hash"])) {
            http_response_code(400);
            echo '{"error":"invalid hash"}';
            exit;
        }

        $hash = $_GET["hash"];

        if (!preg_match('/\A[0-9a-fA-F]{32}\z/', $hash)) {
            http_response_code(400);
            echo '{"error":"invalid hash"}';
            exit;
        }

        return strtoupper($hash);
    }

    function str_value($value) {
        if ($value == "" || $value == null) {
            return 'null';
        }

        return '"'.$value.'"';
    }

    function num_value($value) {
        if ($value == "" || $value == null) {
            return 'null';
        }

        return $value;
    }

    function bool_value($value) {
        if ($value) {
            return 'true';
        }

        return 'false';
    }

    function echo_array($object) {
        if ($object == "Array") {
            if (count($object) == 0) {
                echo "[]";
                return;
            }

            // real array
            if ($object[0] != "") {
                echo "[";
                foreach($object as $value) {
                    echo_array($value);
                    echo ",";
                }
                echo "]";
                return;
            }

            // key/value
            echo "{";
            foreach($object as $key => $value) {
                if ($key == 0) continue; // php sucks
                echo '"'.$key.'":';
                echo_array($value);
                echo ",";
            }
            echo "}";
            return;
        }

        echo '"' . $object . '"';
        return;
    }
?>