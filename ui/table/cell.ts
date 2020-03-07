import {WeyaElementFunction} from "../../lib/weya/weya";
import {RunUI} from "../run_ui";
import {formatInt, formatScalar, formatSize, formatValue} from "../view_components/format";
import {CellOptions} from "../../common/cell";



export abstract class Cell {
    type: string
    name?: string
    key: string
    options: CellOptions
    width: string
    protected isEmpty = false

    constructor(opt: CellOptions) {
        this.options = opt
        this.name = opt.name
        this.key = opt.key
        this.type = opt.type
        if (opt.width == null) {
            this.width = '10em'
        } else {
            this.width = opt.width
        }
    }

    get isHidden(): boolean {
        return this.isEmpty
    }

    renderHeader($: WeyaElementFunction) {
        if(this.isHidden) {
            return
        }

        let elem = $('div.cell', $ => {
            if (this.name != null) {
                $('span', this.name)
            } else {
                this.renderHeaderContent($)
            }
        })
        elem.style.width = this.width
    }

    protected renderHeaderContent($: WeyaElementFunction) {
    }

    protected renderCellContent($: WeyaElementFunction, run: RunUI) {
    }

    protected getValue(run: RunUI): string {
        return null
    }

    renderCell($: WeyaElementFunction, run: RunUI): HTMLElement {
        if(this.isHidden) {
            return null
        }

        let elem = <HTMLElement>$('div.cell', $ => {
            let value = this.getValue(run)
            if (value != null) {
                $('span', value)
            } else {
                this.renderCellContent($, run)
            }
        })
        elem.style.width = this.width

        return elem
    }

    update(runs: RunUI[]) {
    }
}

export class InfoCell extends Cell {
    renderCellContent($: WeyaElementFunction, run: RunUI) {
        $('span', `${run.run.info[this.key]}`)
    }
}

export class ValueCell extends Cell {
    renderCellContent($: WeyaElementFunction, run: RunUI) {
        if (run.values[this.key] != null) {
            $('span', formatScalar(run.values[this.key].value))
        }
    }
}

export class ConfigComputedCell extends Cell {
    renderCellContent($: WeyaElementFunction, run: RunUI) {
        if (run.configs.configs[this.key] == null) {
            return
        }

        let conf = run.configs.configs[this.key]

        if (conf.order < 0) {
            $('span.ignored', `ignored`)
            return
        }

        if (typeof (conf.computed) === "string") {
            let computed: string = conf.computed
            computed = computed.replace('\n', '')
            $('span', computed, {title: computed})
        } else {
            $('span', {title: `${conf.computed}`}, formatValue(conf.computed))
        }
    }
}

export class ConfigOptionCell extends Cell {
    renderCellContent($: WeyaElementFunction, run: RunUI) {
        if (run.configs.configs[this.key] == null) {
            return
        }

        let conf = run.configs.configs[this.key]

        if (conf.order < 0) {
            return
        }

        let options = new Set()
        for (let opt of conf.options) {
            options.add(opt)
        }

        if (options.has(conf.value)) {
            options.delete(conf.value)
            if (options.size === 0) {
                $('span.only_option', conf.value)
            } else {
                $('span.picked', conf.value)
            }
        } else {
            $('span.custom', '-')
        }
        if (options.size > 0) {
            $('span.options', $ => {
                for (let opt of options.keys()) {
                    if (typeof opt !== 'string') {
                        continue
                    }
                    $('span', <string>opt)
                }
            })
        }
    }

    update(runs: RunUI[]) {
        let count = 0

        for(let run of runs) {
            if (run.configs.configs[this.key] == null) {
                continue
            }

            let conf = run.configs.configs[this.key]

            if (conf.order < 0) {
                continue
            }

            let options = new Set()
            for (let opt of conf.options) {
                options.add(opt)
            }

            if (options.size === 0) {
                continue
            }

            count++
        }

        if(count > 0) {
            this.isEmpty = false
        } else {
            this.isEmpty = true
        }
    }
}

export class StepCell extends Cell {
    renderCellContent($: WeyaElementFunction, run: RunUI) {
        let maxStep = 0

        for (let k in run.values) {
            maxStep = Math.max(run.values[k].step, maxStep)
        }

        $('span', formatInt(maxStep))
    }
}

export class DateTimeCell extends Cell {
    protected getValue(run: RunUI): string {
        return `${run.run.info.trial_date} ${run.run.info.trial_time}`
    }

}


export class CommentCell extends Cell {
    protected getValue(run: RunUI): string {
        return run.run.info.comment
    }
}

export class SizeCell extends Cell {
    renderCellContent($: WeyaElementFunction, run: RunUI) {
        let info = run.run.info
        let size: number
        if (this.key === '') {
            size =
                info.sqlite_size +
                info.analytics_size +
                info.checkpoints_size +
                info.tensorboard_size
        } else {
            size = info[this.key]
        }

        $('span', formatSize(size))
    }
}

export class ExperimentNameCell extends Cell {
    protected getValue(run: RunUI): string {
        return run.run.experimentName
    }
}

export class ControlsCell extends Cell {
    protected getValue(run: RunUI): string {
        return ""
    }
}

export class CellFactory {
    static create(opt: CellOptions) {
        switch (opt.type) {
            case "controls":
                return new ControlsCell(opt)
            case "experiment_name":
                return new ExperimentNameCell(opt)
            case "comment":
                return new CommentCell(opt)
            case "date_time":
                return new DateTimeCell(opt)
            case "info":
                return new InfoCell(opt)
            case "size":
                return new SizeCell(opt)
            case "step":
                return new StepCell(opt)
            case "value":
                return new ValueCell(opt)
            case "config_computed":
                return new ConfigComputedCell(opt)
            case "config_options":
                return new ConfigOptionCell(opt)
            default:
                throw new Error("Unknown Cell Type" + opt.type)
        }
    }
}
