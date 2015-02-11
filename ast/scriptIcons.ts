///<reference path='refs.ts'/>
module TDev {
    export module ScriptIcons {
        export function getScriptIcons(): any {
            var commonIcon = "M 172.862,139.945L 240.453,207.537L 308.045,139.945L 339.499,171.399L 271.907,238.991L 339.499,306.582L 308.045,338.036L 240.453,270.445L 172.862,338.036L 141.408,306.582L 208.999,238.991L 141.408,171.399L 172.862,139.945 Z "
            var r = {};
            (["facebook","twitter"]).concat(icons).forEach(k => {
                r[k.toLowerCase()] = commonIcon
            })

            return r;
        }

        export var icons = [
            "123", "8Ball", "ABC", "Acorn", "Add", "AddCircle", "AddFolder", "AddressBook",
            "AddUser", "AdminUser", "Airplane", "AlignCenter", "AlignLeft", "AlignRight",
            "AlmostEqual", "Alram", "Anchor", "Appointment", "ApproveButton", "Arrow-Circle-R",
            "ArrowBox", "ArrowCircleAlt", "ArrowCircleRounded", "ArrowDotted",
            "ArrowDownL", "ArrowDownR", "ArrowDownRounded", "ArrowHead", "ArrowLarge",
            "ArrowLR", "ArrowMoving", "ArrowR", "ArrowRLarge", "ArrowRounded",
            "ArrowStandard", "ArrowStandardCircle", "Award", "BarChart", "Beer", "Bell",
            "Binoculars", "BlankPage", "Bold", "Bolt", "Bomb", "Book", "Bookmark",
            "Briefcase", "Brush", "BulletList", "Bullseye", "Business", "BusinessCard",
            "BusinessPerson", "Butterfly", "Cactus", "Calculator", "Callout", "Camera",
            "Capitalize", "Caution", "ChapBack", "ChapBackCircle", "ChapForward",
            "ChargingBattery", "Check", "CheckAlt", "CheckBox", "CheckCircle",
            "CheckCircleAlt", "Cherry", "Clipboard", "Clock", "Clover", "Club",
            "CoffeeCup", "Command", "CommandLine", "Construction", "Contacts",
            "Controller", "Controls", "Copyright", "CreditCard", "Cube", "Cut", "Cycle",
            "Dashboard", "Delete", "DeleteUser", "DeliveryTruck", "Directions", "Document",
            "Documents", "DocumentsAlt", "Dollar", "DownBox", "Download", "DownloadButton",
            "DownloadButtonAlt", "DownloadPage", "Drawing", "Email", "EmailDoc",
            "EmailOpen", "Emergency", "EmptyBattery", "Erase", "Euro", "Exclamation",
            "ExclamationCircle", "ExclamationCircleAlt", "Exit", "Expand", "Eye", "Farm",
            "Female", "Files", "Film", "Fire", "Fit", "FitHorizontal", "Flag",
            "Fleurdelis", "FlipChart", "FlowChart", "Folder", "FormatText", "Forward",
            "ForwardButton", "FourColumn", "FullBattery", "Funnel", "GasPump", "Globe",
            "GlobeA", "GlobeAS", "GlobeAUS", "GlobeEUA", "GlobeSA", "GlobeUS",
            "Government", "GPS", "Grapes", "Graph", "Group", "HalfBattery", "Hammer",
            "Headphones", "Heart", "HeartAlt", "Help", "Home", "HomeAlt", "Horn",
            "Horseshoe", "HourGlass", "IM", "Inbox", "Info", "InfoCircle", "InfoCircleAlt",
            "Italic", "Journal", "JoyStick", "Justified", "Key", "Lab", "Ladder", "Leaf",
            "Lightbulb", "LineChart", "Link", "Loading", "LoadingAlt", "Location", "Lock",
            "LockedFolder", "Male", "Map", "Martini", "Maximize", "Megaphone", "Mic",
            "MinusBox", "MinusBoxAlt", "MobilePhone", "Money", "Monitor", "Moon",
            "Mountains", "Movie", "MP3Player", "Multiply", "MultiplyCircle", "Music",
            "Mute", "Needle", "NewPage", "NewPageAlt", "NextSceneButton", "NineColumn",
            "Notebook", "NumberedList", "Omega", "OpenFolder", "Package", "PageCurl",
            "Paint", "Painting", "PaperClip", "Pause", "PauseCircle", "Pear", "Pen",
            "PenAlt", "Pencil", "Person", "Phone", "Photo", "Photos", "Pie", "PieChart",
            "Play", "PlayButton", "PlayCircle", "PlusBox", "PlusBoxAlt", "PlusCircle",
            "Pound", "Power", "Presentation", "PriceTag", "Printer", "PushPin", "Question",
            "QuestionCircle", "QuestionCircleAlt", "Quote", "Raindrop", "Reading",
            "Recycle", "RemoveButton", "RemoveFolder", "RemovePage", "RemoveUser",
            "Restore", "Revert", "Rewind", "RewindCircle", "Ribbon", "RunningMan", "Save",
            "SaveAlt", "Screwdriver", "Search", "Setting", "Settings", "Share",
            "ShareThis", "Shield", "Shirt", "ShoppingBag", "ShoppingBasket",
            "ShoppingCart", "ShoppingCartAlt", "Shrink", "Shuffle", "Signal", "SignalAlt",
            "SixColumn", "SmartPhone", "SmilieHappy", "SmilieHappyAlt", "SmilieJustOk",
            "SmilieJustOkAlt", "SmilieSad", "SmilieSadAlt", "SMS", "SMSAlt", "Snowflake",
            "Sort", "SortAZ", "Sound", "SoundHigh", "SoundLow", "Space", "Spade", "Split",
            "Stacks", "Star", "StarAlt", "StrikeOut", "Subtract", "SubtractCircle",
            "Suitcase", "Sun", "Switch", "TabLeft", "TabRight", "Tanktop", "Target",
            "Terminal", "Text", "ThreeColumn", "ThumbsDown", "Ticket", "Tools", "TouchPad",
            "Trash", "Tree", "Umbrella", "Underline", "Unlock", "UpBox", "Upload", "Video",
            "VideoCam", "Wand", "Warning", "WarningAlt", "Watch", "Weather", "Wheel",
            "Wifi", "Wine", "WorkOrder", "Wrench", "WritePage", "Yen", "ZoomIn", "ZoomOut",
        ];

        var winIcons:any = {
            html5: { width: 150, height: 34, path:
            "<path fill='#E34F29' d='M 6.8512e-006,0.00515747L 29.9015,-6.10352e-005L 27.1782,30.6422L 14.9442,34L 2.7297,30.6422L 6.8512e-006,0.00515747 Z M 24.2843,6.37619L 5.62171,6.37097L 6.61292,17.6124L 19.5937,17.6237L 19.1291,22.5482L 14.9439,23.6255L 10.7365,22.5826L 10.4577,19.523L 6.79574,19.5367L 7.26726,25.3395L 14.9439,27.549L 22.6413,25.4152L 23.639,13.8833L 9.93759,13.8833L 9.68507,9.99295L 24.0851,10.0756L 24.2843,6.37619 Z M 69.6986,6.62717L 64.1534,26.2192L 61.4639,26.2192L 57.4274,11.9013C 57.2553,11.292 57.1519,10.6272 57.1169,9.9072L 57.0601,9.9072C 57.0046,10.5806 56.8866,11.2366 56.7058,11.875L 52.6387,26.2192L 49.9754,26.2192L 44.229,6.62717L 46.7612,6.62717L 50.9332,21.6535C 51.1052,22.2833 51.2145,22.9393 51.2612,23.6216L 51.3311,23.6216C 51.3748,23.1376 51.5162,22.4816 51.7553,21.6535L 56.0892,6.62717L 58.2889,6.62717L 62.4478,21.7629C 62.5936,22.2819 62.7029,22.8927 62.7758,23.5952L 62.8326,23.5952C 62.8676,23.1229 62.9901,22.4948 63.2,21.7104L 67.2103,6.62717L 69.6986,6.62717 Z M 82.7133,19.7818L 72.9173,19.7818C 72.9552,21.3008 73.3765,22.4735 74.1812,23.3C 74.9858,24.1265 76.0937,24.5398 77.5048,24.5398C 79.0908,24.5398 80.5471,24.0733 81.8737,23.1404L 81.8737,25.1914C 80.6491,26.0631 79.0281,26.499 77.0106,26.499C 75.0398,26.499 73.4917,25.8678 72.3663,24.6054C 71.2409,23.343 70.6782,21.566 70.6782,19.2744C 70.6782,17.1111 71.2869,15.3488 72.5041,13.9873C 73.7213,12.6258 75.2337,11.9449 77.0412,11.9449C 78.8459,11.9449 80.2424,12.5332 81.2308,13.7096C 82.2191,14.886 82.7133,16.5208 82.7133,18.614L 82.7133,19.7818 Z M 80.4742,17.8225C 80.4655,16.5864 80.155,15.6243 79.5427,14.9362C 78.9305,14.2483 78.0791,13.9042 76.9888,13.9042C 75.9363,13.9042 75.0427,14.2657 74.308,14.9887C 73.5733,15.7117 73.12,16.6564 72.9479,17.8225L 80.4742,17.8225 Z M 88.3679,24.0718L 88.3111,24.0718L 88.3111,26.219L 86.072,26.219L 86.072,5.50754L 88.3111,5.50754L 88.3111,14.805L 88.3679,14.805C 89.47,12.8982 91.0822,11.9449 93.2047,11.9449C 95.0006,11.9449 96.4066,12.5673 97.4226,13.8123C 98.4387,15.0572 98.9467,16.7248 98.9467,18.8152C 98.9467,21.1418 98.3774,23.004 97.239,24.402C 96.1005,25.7999 94.5414,26.4989 92.5618,26.4989C 90.7134,26.4989 89.3154,25.6899 88.3679,24.0718 Z M 88.3111,18.5659L 88.3111,20.477C 88.3111,21.6082 88.6893,22.5681 89.4459,23.3568C 90.2025,24.1454 91.1639,24.5398 92.33,24.5398C 93.6974,24.5398 94.7688,24.0317 95.5443,23.0157C 96.3199,21.9996 96.7076,20.5879 96.7076,18.7802C 96.7076,17.2583 96.3454,16.0652 95.6209,15.2007C 94.8964,14.3363 93.9146,13.9041 92.6755,13.9041C 91.3636,13.9041 90.3081,14.3472 89.5093,15.2335C 88.7105,16.1199 88.3111,17.2306 88.3111,18.5659 Z M 118.259,26.219L 115.687,26.219L 113.531,20.6213L 105.244,20.6213L 103.211,26.219L 100.626,26.219L 108.227,6.62692L 110.632,6.62692L 118.259,26.219 Z M 112.797,18.662L 109.714,10.4448L 109.416,9.14597L 109.359,9.14597C 109.266,9.69699 109.158,10.1299 109.036,10.4448L 105.974,18.662L 112.797,18.662 Z M 123.074,24.0717L 123.017,24.0717L 123.017,32.6563L 120.778,32.6563L 120.778,12.2246L 123.017,12.2246L 123.017,14.8048L 123.074,14.8048C 124.176,12.8981 125.788,11.9447 127.911,11.9447C 129.715,11.9447 131.123,12.5671 132.135,13.8121C 133.147,15.057 133.653,16.7246 133.653,18.815C 133.653,21.1416 133.083,23.0039 131.945,24.4018C 130.806,25.7998 129.247,26.4987 127.268,26.4987C 125.454,26.4987 124.056,25.6897 123.074,24.0717 Z M 123.017,18.5658L 123.017,20.4768C 123.017,21.608 123.395,22.568 124.152,23.3567C 124.908,24.1452 125.87,24.5396 127.036,24.5396C 128.403,24.5396 129.475,24.0315 130.25,23.0155C 131.026,21.9995 131.413,20.5877 131.413,18.78C 131.413,17.2582 131.051,16.0651 130.327,15.2006C 129.602,14.3362 128.62,13.9039 127.381,13.9039C 126.069,13.9039 125.014,14.347 124.215,15.2334C 123.416,16.1198 123.017,17.2304 123.017,18.5658 Z M 139.587,24.0716L 139.53,24.0716L 139.53,32.6562L 137.291,32.6562L 137.291,12.2246L 139.53,12.2246L 139.53,14.8047L 139.587,14.8047C 140.689,12.898 142.301,11.9446 144.424,11.9446C 146.228,11.9446 147.637,12.567 148.648,13.812C 149.66,15.0569 150.166,16.7246 150.166,18.8149C 150.166,21.1416 149.597,23.0038 148.458,24.4017C 147.32,25.7997 145.761,26.4987 143.781,26.4987C 141.967,26.4987 140.57,25.6897 139.587,24.0716 Z M 139.53,18.5657L 139.53,20.4768C 139.53,21.6079 139.908,22.5679 140.665,23.3566C 141.422,24.1451 142.383,24.5395 143.549,24.5395C 144.916,24.5395 145.988,24.0315 146.763,23.0154C 147.539,21.9994 147.927,20.5876 147.927,18.7799C 147.927,17.2581 147.564,16.065 146.84,15.2005C 146.116,14.3361 145.134,13.9038 143.895,13.9038C 142.583,13.9038 141.527,14.347 140.728,15.2333C 139.93,16.1197 139.53,17.2303 139.53,18.5657 Z '/>"
            }
        };

        export function getWinLogo(name:string, height : number = 2, color:string = null) {
            var img = winIcons[name];
            if (!img)
                img = winIcons["html5"];
            var path = img.path
            if (color) {
                path = path.replace(/fill='[^']*'/, "fill='" + color + "'")
            }
            var r = SVG.svgToElement(SVG.svgBoilerPlate('0 0 ' + img.width + ' ' + img.height, path));
            r.style.height = height + "em";
            r.style.width = (img.width / img.height * height) + "em";
            return r;
        }

        export function stableIconFromName(name:string)
        {
            return icons[(Util.getStableHashCode(name) & 0x7fffffff) % icons.length];
        }

        export function stableColorFromName(name:string) : string
        {
            return Util.colors[(Util.getStableHashCode(name) & 0x7fffffff) % (Util.colors.length - 1)];
        }
    }
}
