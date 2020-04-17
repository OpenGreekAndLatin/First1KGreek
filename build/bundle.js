
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.20.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* node_modules/svelte-table/src/SvelteTable.svelte generated by Svelte v3.20.1 */

    const { Object: Object_1 } = globals;
    const file = "node_modules/svelte-table/src/SvelteTable.svelte";

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[34] = list[i];
    	return child_ctx;
    }

    const get_row_slot_changes = dirty => ({ row: dirty[0] & /*c_rows*/ 8192 });
    const get_row_slot_context = ctx => ({ row: /*row*/ ctx[31], n: /*n*/ ctx[33] });

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[31] = list[i];
    	child_ctx[33] = i;
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[34] = list[i];
    	return child_ctx;
    }

    const get_header_slot_changes = dirty => ({
    	sortOrder: dirty[0] & /*sortOrder*/ 2,
    	sortBy: dirty[0] & /*sortBy*/ 1
    });

    const get_header_slot_context = ctx => ({
    	sortOrder: /*sortOrder*/ ctx[1],
    	sortBy: /*sortBy*/ ctx[0]
    });

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[41] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[34] = list[i];
    	return child_ctx;
    }

    // (111:4) {#if showFilterHeader}
    function create_if_block_1(ctx) {
    	let tr;
    	let each_value_3 = /*columns*/ ctx[2];
    	validate_each_argument(each_value_3);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	const block = {
    		c: function create() {
    			tr = element("tr");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(tr, "class", "svelte-w7dofd");
    			add_location(tr, file, 111, 6, 2818);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tr, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*asStringArray, classNameSelect, filterSettings, columns, filterValues*/ 39172) {
    				each_value_3 = /*columns*/ ctx[2];
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tr, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_3.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(111:4) {#if showFilterHeader}",
    		ctx
    	});

    	return block;
    }

    // (115:12) {#if filterValues[col.key] !== undefined}
    function create_if_block_2(ctx) {
    	let select;
    	let option;
    	let select_class_value;
    	let dispose;
    	let each_value_4 = /*filterValues*/ ctx[11][/*col*/ ctx[34].key];
    	validate_each_argument(each_value_4);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
    	}

    	function select_change_handler() {
    		/*select_change_handler*/ ctx[27].call(select, /*col*/ ctx[34]);
    	}

    	const block = {
    		c: function create() {
    			select = element("select");
    			option = element("option");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			option.__value = undefined;
    			option.value = option.__value;
    			add_location(option, file, 116, 16, 3038);
    			attr_dev(select, "class", select_class_value = "" + (null_to_empty(/*asStringArray*/ ctx[15](/*classNameSelect*/ ctx[8])) + " svelte-w7dofd"));
    			if (/*filterSettings*/ ctx[12][/*col*/ ctx[34].key] === void 0) add_render_callback(select_change_handler);
    			add_location(select, file, 115, 14, 2937);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, select, anchor);
    			append_dev(select, option);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}

    			select_option(select, /*filterSettings*/ ctx[12][/*col*/ ctx[34].key]);
    			if (remount) dispose();
    			dispose = listen_dev(select, "change", select_change_handler);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*filterValues, columns*/ 2052) {
    				each_value_4 = /*filterValues*/ ctx[11][/*col*/ ctx[34].key];
    				validate_each_argument(each_value_4);
    				let i;

    				for (i = 0; i < each_value_4.length; i += 1) {
    					const child_ctx = get_each_context_4(ctx, each_value_4, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_4(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_4.length;
    			}

    			if (dirty[0] & /*classNameSelect*/ 256 && select_class_value !== (select_class_value = "" + (null_to_empty(/*asStringArray*/ ctx[15](/*classNameSelect*/ ctx[8])) + " svelte-w7dofd"))) {
    				attr_dev(select, "class", select_class_value);
    			}

    			if (dirty[0] & /*filterSettings, columns*/ 4100) {
    				select_option(select, /*filterSettings*/ ctx[12][/*col*/ ctx[34].key]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(select);
    			destroy_each(each_blocks, detaching);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(115:12) {#if filterValues[col.key] !== undefined}",
    		ctx
    	});

    	return block;
    }

    // (118:16) {#each filterValues[col.key] as option}
    function create_each_block_4(ctx) {
    	let option;
    	let t_value = /*option*/ ctx[41].name + "";
    	let t;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*option*/ ctx[41].value;
    			option.value = option.__value;
    			add_location(option, file, 118, 18, 3148);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*filterValues, columns*/ 2052 && t_value !== (t_value = /*option*/ ctx[41].name + "")) set_data_dev(t, t_value);

    			if (dirty[0] & /*filterValues, columns*/ 2052 && option_value_value !== (option_value_value = /*option*/ ctx[41].value)) {
    				prop_dev(option, "__value", option_value_value);
    			}

    			option.value = option.__value;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_4.name,
    		type: "each",
    		source: "(118:16) {#each filterValues[col.key] as option}",
    		ctx
    	});

    	return block;
    }

    // (113:8) {#each columns as col}
    function create_each_block_3(ctx) {
    	let th;
    	let t;
    	let if_block = /*filterValues*/ ctx[11][/*col*/ ctx[34].key] !== undefined && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			th = element("th");
    			if (if_block) if_block.c();
    			t = space();
    			add_location(th, file, 113, 10, 2864);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, th, anchor);
    			if (if_block) if_block.m(th, null);
    			append_dev(th, t);
    		},
    		p: function update(ctx, dirty) {
    			if (/*filterValues*/ ctx[11][/*col*/ ctx[34].key] !== undefined) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_2(ctx);
    					if_block.c();
    					if_block.m(th, t);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(th);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(113:8) {#each columns as col}",
    		ctx
    	});

    	return block;
    }

    // (135:14) {#if sortBy === col.key}
    function create_if_block(ctx) {
    	let t_value = (/*sortOrder*/ ctx[1] === 1
    	? /*iconAsc*/ ctx[3]
    	: /*iconDesc*/ ctx[4]) + "";

    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*sortOrder, iconAsc, iconDesc*/ 26 && t_value !== (t_value = (/*sortOrder*/ ctx[1] === 1
    			? /*iconAsc*/ ctx[3]
    			: /*iconDesc*/ ctx[4]) + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(135:14) {#if sortBy === col.key}",
    		ctx
    	});

    	return block;
    }

    // (129:10) {#each columns as col}
    function create_each_block_2(ctx) {
    	let th;
    	let t0_value = /*col*/ ctx[34].title + "";
    	let t0;
    	let t1;
    	let t2;
    	let th_class_value;
    	let dispose;
    	let if_block = /*sortBy*/ ctx[0] === /*col*/ ctx[34].key && create_if_block(ctx);

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[28](/*col*/ ctx[34], ...args);
    	}

    	const block = {
    		c: function create() {
    			th = element("th");
    			t0 = text(t0_value);
    			t1 = space();
    			if (if_block) if_block.c();
    			t2 = space();

    			attr_dev(th, "class", th_class_value = "" + (null_to_empty(/*asStringArray*/ ctx[15]([
    				/*col*/ ctx[34].sortable ? "isSortable" : null,
    				/*col*/ ctx[34].headerClass
    			])) + " svelte-w7dofd"));

    			add_location(th, file, 129, 12, 3443);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, th, anchor);
    			append_dev(th, t0);
    			append_dev(th, t1);
    			if (if_block) if_block.m(th, null);
    			append_dev(th, t2);
    			if (remount) dispose();
    			dispose = listen_dev(th, "click", click_handler, false, false, false);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*columns*/ 4 && t0_value !== (t0_value = /*col*/ ctx[34].title + "")) set_data_dev(t0, t0_value);

    			if (/*sortBy*/ ctx[0] === /*col*/ ctx[34].key) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(th, t2);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty[0] & /*columns*/ 4 && th_class_value !== (th_class_value = "" + (null_to_empty(/*asStringArray*/ ctx[15]([
    				/*col*/ ctx[34].sortable ? "isSortable" : null,
    				/*col*/ ctx[34].headerClass
    			])) + " svelte-w7dofd"))) {
    				attr_dev(th, "class", th_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(th);
    			if (if_block) if_block.d();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(129:10) {#each columns as col}",
    		ctx
    	});

    	return block;
    }

    // (127:64)          
    function fallback_block_1(ctx) {
    	let tr;
    	let each_value_2 = /*columns*/ ctx[2];
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const block = {
    		c: function create() {
    			tr = element("tr");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(tr, file, 127, 8, 3393);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tr, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*asStringArray, columns, handleClickCol, sortOrder, iconAsc, iconDesc, sortBy*/ 98335) {
    				each_value_2 = /*columns*/ ctx[2];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tr, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block_1.name,
    		type: "fallback",
    		source: "(127:64)          ",
    		ctx
    	});

    	return block;
    }

    // (147:10) {#each columns as col}
    function create_each_block_1(ctx) {
    	let td;

    	let raw_value = (/*col*/ ctx[34].renderValue
    	? /*col*/ ctx[34].renderValue(/*row*/ ctx[31])
    	: /*col*/ ctx[34].value(/*row*/ ctx[31])) + "";

    	let td_class_value;
    	let dispose;

    	function click_handler_1(...args) {
    		return /*click_handler_1*/ ctx[29](/*row*/ ctx[31], /*col*/ ctx[34], ...args);
    	}

    	const block = {
    		c: function create() {
    			td = element("td");
    			attr_dev(td, "class", td_class_value = "" + (null_to_empty(/*asStringArray*/ ctx[15]([/*col*/ ctx[34].class, /*classNameCell*/ ctx[10]])) + " svelte-w7dofd"));
    			add_location(td, file, 147, 12, 4068);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, td, anchor);
    			td.innerHTML = raw_value;
    			if (remount) dispose();
    			dispose = listen_dev(td, "click", click_handler_1, false, false, false);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*columns, c_rows*/ 8196 && raw_value !== (raw_value = (/*col*/ ctx[34].renderValue
    			? /*col*/ ctx[34].renderValue(/*row*/ ctx[31])
    			: /*col*/ ctx[34].value(/*row*/ ctx[31])) + "")) td.innerHTML = raw_value;
    			if (dirty[0] & /*columns, classNameCell*/ 1028 && td_class_value !== (td_class_value = "" + (null_to_empty(/*asStringArray*/ ctx[15]([/*col*/ ctx[34].class, /*classNameCell*/ ctx[10]])) + " svelte-w7dofd"))) {
    				attr_dev(td, "class", td_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(147:10) {#each columns as col}",
    		ctx
    	});

    	return block;
    }

    // (145:40)          
    function fallback_block(ctx) {
    	let tr;
    	let tr_class_value;
    	let t;
    	let dispose;
    	let each_value_1 = /*columns*/ ctx[2];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	function click_handler_2(...args) {
    		return /*click_handler_2*/ ctx[30](/*row*/ ctx[31], ...args);
    	}

    	const block = {
    		c: function create() {
    			tr = element("tr");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			attr_dev(tr, "class", tr_class_value = "" + (null_to_empty(/*asStringArray*/ ctx[15](/*classNameRow*/ ctx[9])) + " svelte-w7dofd"));
    			add_location(tr, file, 145, 8, 3945);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, tr, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tr, null);
    			}

    			insert_dev(target, t, anchor);
    			if (remount) dispose();
    			dispose = listen_dev(tr, "click", click_handler_2, false, false, false);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*asStringArray, columns, classNameCell, handleClickCell, c_rows*/ 304132) {
    				each_value_1 = /*columns*/ ctx[2];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tr, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}

    			if (dirty[0] & /*classNameRow*/ 512 && tr_class_value !== (tr_class_value = "" + (null_to_empty(/*asStringArray*/ ctx[15](/*classNameRow*/ ctx[9])) + " svelte-w7dofd"))) {
    				attr_dev(tr, "class", tr_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block.name,
    		type: "fallback",
    		source: "(145:40)          ",
    		ctx
    	});

    	return block;
    }

    // (144:4) {#each c_rows as row, n}
    function create_each_block(ctx) {
    	let current;
    	const row_slot_template = /*$$slots*/ ctx[26].row;
    	const row_slot = create_slot(row_slot_template, ctx, /*$$scope*/ ctx[25], get_row_slot_context);
    	const row_slot_or_fallback = row_slot || fallback_block(ctx);

    	const block = {
    		c: function create() {
    			if (row_slot_or_fallback) row_slot_or_fallback.c();
    		},
    		m: function mount(target, anchor) {
    			if (row_slot_or_fallback) {
    				row_slot_or_fallback.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (row_slot) {
    				if (row_slot.p && dirty[0] & /*$$scope, c_rows*/ 33562624) {
    					row_slot.p(get_slot_context(row_slot_template, ctx, /*$$scope*/ ctx[25], get_row_slot_context), get_slot_changes(row_slot_template, /*$$scope*/ ctx[25], dirty, get_row_slot_changes));
    				}
    			} else {
    				if (row_slot_or_fallback && row_slot_or_fallback.p && dirty[0] & /*classNameRow, c_rows, columns, classNameCell*/ 9732) {
    					row_slot_or_fallback.p(ctx, dirty);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(row_slot_or_fallback, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(row_slot_or_fallback, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (row_slot_or_fallback) row_slot_or_fallback.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(144:4) {#each c_rows as row, n}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let table;
    	let thead;
    	let t0;
    	let thead_class_value;
    	let t1;
    	let tbody;
    	let tbody_class_value;
    	let table_class_value;
    	let current;
    	let if_block = /*showFilterHeader*/ ctx[14] && create_if_block_1(ctx);
    	const header_slot_template = /*$$slots*/ ctx[26].header;
    	const header_slot = create_slot(header_slot_template, ctx, /*$$scope*/ ctx[25], get_header_slot_context);
    	const header_slot_or_fallback = header_slot || fallback_block_1(ctx);
    	let each_value = /*c_rows*/ ctx[13];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			table = element("table");
    			thead = element("thead");
    			if (if_block) if_block.c();
    			t0 = space();
    			if (header_slot_or_fallback) header_slot_or_fallback.c();
    			t1 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(thead, "class", thead_class_value = "" + (null_to_empty(/*asStringArray*/ ctx[15](/*classNameThead*/ ctx[6])) + " svelte-w7dofd"));
    			add_location(thead, file, 109, 2, 2739);
    			attr_dev(tbody, "class", tbody_class_value = "" + (null_to_empty(/*asStringArray*/ ctx[15](/*classNameTbody*/ ctx[7])) + " svelte-w7dofd"));
    			add_location(tbody, file, 142, 2, 3821);
    			attr_dev(table, "class", table_class_value = "" + (null_to_empty(/*asStringArray*/ ctx[15](/*classNameTable*/ ctx[5])) + " svelte-w7dofd"));
    			add_location(table, file, 108, 0, 2691);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, table, anchor);
    			append_dev(table, thead);
    			if (if_block) if_block.m(thead, null);
    			append_dev(thead, t0);

    			if (header_slot_or_fallback) {
    				header_slot_or_fallback.m(thead, null);
    			}

    			append_dev(table, t1);
    			append_dev(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*showFilterHeader*/ ctx[14]) if_block.p(ctx, dirty);

    			if (header_slot) {
    				if (header_slot.p && dirty[0] & /*$$scope, sortOrder, sortBy*/ 33554435) {
    					header_slot.p(get_slot_context(header_slot_template, ctx, /*$$scope*/ ctx[25], get_header_slot_context), get_slot_changes(header_slot_template, /*$$scope*/ ctx[25], dirty, get_header_slot_changes));
    				}
    			} else {
    				if (header_slot_or_fallback && header_slot_or_fallback.p && dirty[0] & /*columns, sortOrder, iconAsc, iconDesc, sortBy*/ 31) {
    					header_slot_or_fallback.p(ctx, dirty);
    				}
    			}

    			if (!current || dirty[0] & /*classNameThead*/ 64 && thead_class_value !== (thead_class_value = "" + (null_to_empty(/*asStringArray*/ ctx[15](/*classNameThead*/ ctx[6])) + " svelte-w7dofd"))) {
    				attr_dev(thead, "class", thead_class_value);
    			}

    			if (dirty[0] & /*asStringArray, classNameRow, handleClickRow, c_rows, columns, classNameCell, handleClickCell, $$scope*/ 33990148) {
    				each_value = /*c_rows*/ ctx[13];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(tbody, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (!current || dirty[0] & /*classNameTbody*/ 128 && tbody_class_value !== (tbody_class_value = "" + (null_to_empty(/*asStringArray*/ ctx[15](/*classNameTbody*/ ctx[7])) + " svelte-w7dofd"))) {
    				attr_dev(tbody, "class", tbody_class_value);
    			}

    			if (!current || dirty[0] & /*classNameTable*/ 32 && table_class_value !== (table_class_value = "" + (null_to_empty(/*asStringArray*/ ctx[15](/*classNameTable*/ ctx[5])) + " svelte-w7dofd"))) {
    				attr_dev(table, "class", table_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header_slot_or_fallback, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header_slot_or_fallback, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(table);
    			if (if_block) if_block.d();
    			if (header_slot_or_fallback) header_slot_or_fallback.d(detaching);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let { columns } = $$props;
    	let { rows } = $$props;
    	let { sortBy = "" } = $$props;
    	let { sortOrder = 1 } = $$props;
    	let { iconAsc = "▲" } = $$props;
    	let { iconDesc = "▼" } = $$props;
    	let { classNameTable = "" } = $$props;
    	let { classNameThead = "" } = $$props;
    	let { classNameTbody = "" } = $$props;
    	let { classNameSelect = "" } = $$props;
    	let { classNameRow = "" } = $$props;
    	let { classNameCell = "" } = $$props;
    	let sortFunction = () => "";
    	let showFilterHeader = columns.some(c => c.filterOptions !== undefined);
    	let filterValues = {};
    	let filterSettings = {};
    	let columnByKey = {};

    	columns.forEach(col => {
    		$$invalidate(21, columnByKey[col.key] = col, columnByKey);
    	});

    	const asStringArray = v => [].concat(v).filter(v => typeof v === "string" && v !== "").join(" ");

    	const calculateFilterValues = () => {
    		$$invalidate(11, filterValues = {});

    		columns.forEach(c => {
    			if (typeof c.filterOptions === "function") {
    				$$invalidate(11, filterValues[c.key] = c.filterOptions(rows), filterValues);
    			} else if (Array.isArray(c.filterOptions)) {
    				// if array of strings is provided, use it for name and value
    				$$invalidate(11, filterValues[c.key] = c.filterOptions.map(val => ({ name: val, value: val })), filterValues);
    			}
    		});
    	};

    	

    	const updateSortOrder = colKey => {
    		if (colKey === sortBy) {
    			$$invalidate(1, sortOrder = sortOrder === 1 ? -1 : 1);
    		} else {
    			$$invalidate(1, sortOrder = 1);
    		}
    	};

    	const handleClickCol = col => {
    		updateSortOrder(col.key);
    		$$invalidate(0, sortBy = col.key);
    		dispatch("clickCol", { key: col.key });
    	};

    	const handleClickRow = row => {
    		dispatch("clickRow", { row });
    	};

    	const handleClickCell = (row, key) => {
    		dispatch("clickCell", { row, key });
    	};

    	if (showFilterHeader) {
    		calculateFilterValues();
    	}

    	const writable_props = [
    		"columns",
    		"rows",
    		"sortBy",
    		"sortOrder",
    		"iconAsc",
    		"iconDesc",
    		"classNameTable",
    		"classNameThead",
    		"classNameTbody",
    		"classNameSelect",
    		"classNameRow",
    		"classNameCell"
    	];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<SvelteTable> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("SvelteTable", $$slots, ['header','row']);

    	function select_change_handler(col) {
    		filterSettings[col.key] = select_value(this);
    		$$invalidate(12, filterSettings);
    		$$invalidate(2, columns);
    		$$invalidate(11, filterValues);
    	}

    	const click_handler = col => handleClickCol(col);

    	const click_handler_1 = (row, col) => {
    		handleClickCell(row, col.key);
    	};

    	const click_handler_2 = row => {
    		handleClickRow(row);
    	};

    	$$self.$set = $$props => {
    		if ("columns" in $$props) $$invalidate(2, columns = $$props.columns);
    		if ("rows" in $$props) $$invalidate(19, rows = $$props.rows);
    		if ("sortBy" in $$props) $$invalidate(0, sortBy = $$props.sortBy);
    		if ("sortOrder" in $$props) $$invalidate(1, sortOrder = $$props.sortOrder);
    		if ("iconAsc" in $$props) $$invalidate(3, iconAsc = $$props.iconAsc);
    		if ("iconDesc" in $$props) $$invalidate(4, iconDesc = $$props.iconDesc);
    		if ("classNameTable" in $$props) $$invalidate(5, classNameTable = $$props.classNameTable);
    		if ("classNameThead" in $$props) $$invalidate(6, classNameThead = $$props.classNameThead);
    		if ("classNameTbody" in $$props) $$invalidate(7, classNameTbody = $$props.classNameTbody);
    		if ("classNameSelect" in $$props) $$invalidate(8, classNameSelect = $$props.classNameSelect);
    		if ("classNameRow" in $$props) $$invalidate(9, classNameRow = $$props.classNameRow);
    		if ("classNameCell" in $$props) $$invalidate(10, classNameCell = $$props.classNameCell);
    		if ("$$scope" in $$props) $$invalidate(25, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		columns,
    		rows,
    		sortBy,
    		sortOrder,
    		iconAsc,
    		iconDesc,
    		classNameTable,
    		classNameThead,
    		classNameTbody,
    		classNameSelect,
    		classNameRow,
    		classNameCell,
    		sortFunction,
    		showFilterHeader,
    		filterValues,
    		filterSettings,
    		columnByKey,
    		asStringArray,
    		calculateFilterValues,
    		updateSortOrder,
    		handleClickCol,
    		handleClickRow,
    		handleClickCell,
    		c_rows
    	});

    	$$self.$inject_state = $$props => {
    		if ("columns" in $$props) $$invalidate(2, columns = $$props.columns);
    		if ("rows" in $$props) $$invalidate(19, rows = $$props.rows);
    		if ("sortBy" in $$props) $$invalidate(0, sortBy = $$props.sortBy);
    		if ("sortOrder" in $$props) $$invalidate(1, sortOrder = $$props.sortOrder);
    		if ("iconAsc" in $$props) $$invalidate(3, iconAsc = $$props.iconAsc);
    		if ("iconDesc" in $$props) $$invalidate(4, iconDesc = $$props.iconDesc);
    		if ("classNameTable" in $$props) $$invalidate(5, classNameTable = $$props.classNameTable);
    		if ("classNameThead" in $$props) $$invalidate(6, classNameThead = $$props.classNameThead);
    		if ("classNameTbody" in $$props) $$invalidate(7, classNameTbody = $$props.classNameTbody);
    		if ("classNameSelect" in $$props) $$invalidate(8, classNameSelect = $$props.classNameSelect);
    		if ("classNameRow" in $$props) $$invalidate(9, classNameRow = $$props.classNameRow);
    		if ("classNameCell" in $$props) $$invalidate(10, classNameCell = $$props.classNameCell);
    		if ("sortFunction" in $$props) $$invalidate(20, sortFunction = $$props.sortFunction);
    		if ("showFilterHeader" in $$props) $$invalidate(14, showFilterHeader = $$props.showFilterHeader);
    		if ("filterValues" in $$props) $$invalidate(11, filterValues = $$props.filterValues);
    		if ("filterSettings" in $$props) $$invalidate(12, filterSettings = $$props.filterSettings);
    		if ("columnByKey" in $$props) $$invalidate(21, columnByKey = $$props.columnByKey);
    		if ("c_rows" in $$props) $$invalidate(13, c_rows = $$props.c_rows);
    	};

    	let c_rows;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*columnByKey, sortBy*/ 2097153) {
    			 {
    				let col = columnByKey[sortBy];

    				if (col !== undefined && col.sortable === true && typeof col.value === "function") {
    					$$invalidate(20, sortFunction = r => col.value(r));
    				}
    			}
    		}

    		if ($$self.$$.dirty[0] & /*rows, filterSettings, columnByKey, sortFunction, sortOrder*/ 3674114) {
    			 $$invalidate(13, c_rows = rows.filter(r => Object.keys(filterSettings).every(f => {
    				let ret = filterSettings[f] === undefined || // default to value() if filterValue() not provided in col
    				filterSettings[f] === (typeof columnByKey[f].filterValue === "function"
    				? columnByKey[f].filterValue(r)
    				: columnByKey[f].value(r));

    				return ret;
    			})).map(r => Object.assign({}, r, { $sortOn: sortFunction(r) })).sort((a, b) => {
    				if (a.$sortOn > b.$sortOn) return sortOrder; else if (a.$sortOn < b.$sortOn) return -sortOrder;
    				return 0;
    			}));
    		}
    	};

    	return [
    		sortBy,
    		sortOrder,
    		columns,
    		iconAsc,
    		iconDesc,
    		classNameTable,
    		classNameThead,
    		classNameTbody,
    		classNameSelect,
    		classNameRow,
    		classNameCell,
    		filterValues,
    		filterSettings,
    		c_rows,
    		showFilterHeader,
    		asStringArray,
    		handleClickCol,
    		handleClickRow,
    		handleClickCell,
    		rows,
    		sortFunction,
    		columnByKey,
    		dispatch,
    		calculateFilterValues,
    		updateSortOrder,
    		$$scope,
    		$$slots,
    		select_change_handler,
    		click_handler,
    		click_handler_1,
    		click_handler_2
    	];
    }

    class SvelteTable extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance,
    			create_fragment,
    			safe_not_equal,
    			{
    				columns: 2,
    				rows: 19,
    				sortBy: 0,
    				sortOrder: 1,
    				iconAsc: 3,
    				iconDesc: 4,
    				classNameTable: 5,
    				classNameThead: 6,
    				classNameTbody: 7,
    				classNameSelect: 8,
    				classNameRow: 9,
    				classNameCell: 10
    			},
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SvelteTable",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*columns*/ ctx[2] === undefined && !("columns" in props)) {
    			console.warn("<SvelteTable> was created without expected prop 'columns'");
    		}

    		if (/*rows*/ ctx[19] === undefined && !("rows" in props)) {
    			console.warn("<SvelteTable> was created without expected prop 'rows'");
    		}
    	}

    	get columns() {
    		throw new Error("<SvelteTable>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set columns(value) {
    		throw new Error("<SvelteTable>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get rows() {
    		throw new Error("<SvelteTable>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set rows(value) {
    		throw new Error("<SvelteTable>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sortBy() {
    		throw new Error("<SvelteTable>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sortBy(value) {
    		throw new Error("<SvelteTable>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sortOrder() {
    		throw new Error("<SvelteTable>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sortOrder(value) {
    		throw new Error("<SvelteTable>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get iconAsc() {
    		throw new Error("<SvelteTable>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set iconAsc(value) {
    		throw new Error("<SvelteTable>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get iconDesc() {
    		throw new Error("<SvelteTable>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set iconDesc(value) {
    		throw new Error("<SvelteTable>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get classNameTable() {
    		throw new Error("<SvelteTable>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set classNameTable(value) {
    		throw new Error("<SvelteTable>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get classNameThead() {
    		throw new Error("<SvelteTable>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set classNameThead(value) {
    		throw new Error("<SvelteTable>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get classNameTbody() {
    		throw new Error("<SvelteTable>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set classNameTbody(value) {
    		throw new Error("<SvelteTable>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get classNameSelect() {
    		throw new Error("<SvelteTable>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set classNameSelect(value) {
    		throw new Error("<SvelteTable>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get classNameRow() {
    		throw new Error("<SvelteTable>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set classNameRow(value) {
    		throw new Error("<SvelteTable>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get classNameCell() {
    		throw new Error("<SvelteTable>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set classNameCell(value) {
    		throw new Error("<SvelteTable>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.20.1 */
    const file$1 = "src/App.svelte";

    function create_fragment$1(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let p0;
    	let t2;
    	let a0;
    	let t4;
    	let a1;
    	let t6;
    	let t7;
    	let p1;
    	let t8;
    	let a2;
    	let t10;
    	let strong0;
    	let t12;
    	let strong1;
    	let t14;
    	let t15;
    	let p2;
    	let t17;
    	let p3;
    	let t18;
    	let a3;
    	let t20;
    	let t21;
    	let button0;
    	let t23;
    	let button1;
    	let t25;
    	let button2;
    	let t27;
    	let current;
    	let dispose;

    	const sveltetable = new SvelteTable({
    			props: {
    				columns: /*columns*/ ctx[3],
    				rows: /*rows*/ ctx[2]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Welcome to the First1KGreek Project!";
    			t1 = space();
    			p0 = element("p");
    			t2 = text("The goal of this project is to collect at least one edition of every Greek work composed between Homer and 250CE with a focus on texts that do not already exist in the Perseus Digital Library. So, e.g., neither Thucydides nor the text of the New Testament are here because both of these texts are already in ");
    			a0 = element("a");
    			a0.textContent = "Perseus";
    			t4 = text(". The TEI XML versions of the Perseus Greek texts (c. 10 million words) are available at ");
    			a1 = element("a");
    			a1.textContent = "GitHub";
    			t6 = text(", where they are being revised (upgrading to epiDoc compliant P5 TEI XML) and reorganized to be more readily CTS compliant. This project has been generously funded by the Harvard Library Arcadia Fund, European Social Fund, and the Alexander-von-Humboldt professorship for Digital Humanities at Leipzig. The data has been produced in an international cooperation with the Center for Hellenic Studies, the Harvard Library, Mount Alison University, Tufts University, the University of Leipzig, and the University of Virginia.");
    			t7 = space();
    			p1 = element("p");
    			t8 = text("All the works in the repository for which we have added metadata are listed below with links to the individual files. Note that all of these files are 100% CTS-compliant. If you see any problems with this list, please start an issue on the ");
    			a2 = element("a");
    			a2.textContent = "main repository page";
    			t10 = text(". At this time, the repository contains ");
    			strong0 = element("strong");
    			strong0.textContent = `${/*wordCountAll*/ ctx[0]}`;
    			t12 = text(" words in ");
    			strong1 = element("strong");
    			strong1.textContent = `${/*nodeCountAll*/ ctx[1]}`;
    			t14 = text(" CTS-nodes. The text is primarily in Greek, with more texts currently being corrected and converted to epiDoc-compliant TEI XML. When these remaining texts and the Perseus collection are added, the amount of CC-licensed TEI XML Greek available on GitHub will exceed 30 million words.");
    			t15 = space();
    			p2 = element("p");
    			p2.textContent = "The list below also includes the unique identifiers that we use for every author, work, and edition. We use standard identifiers to name our texts, including references to the numbers adopted by the canons of the TLG and (for Latin) PHI. The final element in the URN identifies the edition. See the TEI headers of the individual files to find all information about the origin of the file.";
    			t17 = space();
    			p3 = element("p");
    			t18 = text("The list as well as node and word counts were generated using ");
    			a3 = element("a");
    			a3.textContent = "TEItoCEX";
    			t20 = text(" by Thomas Koentges. You can also use the download buttons to access the data.");
    			t21 = space();
    			button0 = element("button");
    			button0.textContent = "Zip-file";
    			t23 = space();
    			button1 = element("button");
    			button1.textContent = "Tar-ball";
    			t25 = space();
    			button2 = element("button");
    			button2.textContent = "Github";
    			t27 = space();
    			create_component(sveltetable.$$.fragment);
    			attr_dev(h1, "class", "svelte-1vpoctg");
    			add_location(h1, file$1, 71, 1, 1355);
    			attr_dev(a0, "href", "http://www.perseus.tufts.edu/hopper/");
    			add_location(a0, file$1, 72, 312, 1714);
    			attr_dev(a1, "href", "https://github.com/PerseusDL/canonical-greekLit");
    			add_location(a1, file$1, 72, 461, 1863);
    			attr_dev(p0, "class", "svelte-1vpoctg");
    			add_location(p0, file$1, 72, 1, 1403);
    			attr_dev(a2, "href", "https://github.com/OpenGreekAndLatin/First1KGreek/issues");
    			add_location(a2, file$1, 74, 243, 2704);
    			add_location(strong0, file$1, 74, 374, 2835);
    			add_location(strong1, file$1, 74, 415, 2876);
    			attr_dev(p1, "class", "svelte-1vpoctg");
    			add_location(p1, file$1, 74, 0, 2461);
    			attr_dev(p2, "class", "svelte-1vpoctg");
    			add_location(p2, file$1, 76, 0, 3196);
    			attr_dev(a3, "href", "https://github.com/ThomasK81/TEItoCEX");
    			add_location(a3, file$1, 78, 65, 3658);
    			attr_dev(p3, "class", "svelte-1vpoctg");
    			add_location(p3, file$1, 78, 0, 3593);
    			add_location(button0, file$1, 79, 1, 3802);
    			add_location(button1, file$1, 82, 1, 3855);
    			add_location(button2, file$1, 85, 1, 3908);
    			attr_dev(main, "class", "svelte-1vpoctg");
    			add_location(main, file$1, 70, 0, 1347);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, p0);
    			append_dev(p0, t2);
    			append_dev(p0, a0);
    			append_dev(p0, t4);
    			append_dev(p0, a1);
    			append_dev(p0, t6);
    			append_dev(main, t7);
    			append_dev(main, p1);
    			append_dev(p1, t8);
    			append_dev(p1, a2);
    			append_dev(p1, t10);
    			append_dev(p1, strong0);
    			append_dev(p1, t12);
    			append_dev(p1, strong1);
    			append_dev(p1, t14);
    			append_dev(main, t15);
    			append_dev(main, p2);
    			append_dev(main, t17);
    			append_dev(main, p3);
    			append_dev(p3, t18);
    			append_dev(p3, a3);
    			append_dev(p3, t20);
    			append_dev(main, t21);
    			append_dev(main, button0);
    			append_dev(main, t23);
    			append_dev(main, button1);
    			append_dev(main, t25);
    			append_dev(main, button2);
    			append_dev(main, t27);
    			mount_component(sveltetable, main, null);
    			current = true;
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(button0, "click", handleZip, false, false, false),
    				listen_dev(button1, "click", handleTar, false, false, false),
    				listen_dev(button2, "click", handleGit, false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			const sveltetable_changes = {};
    			if (dirty & /*rows*/ 4) sveltetable_changes.rows = /*rows*/ ctx[2];
    			sveltetable.$set(sveltetable_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(sveltetable.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(sveltetable.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(sveltetable);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function handleZip() {
    	window.location.assign("https://github.com/OpenGreekAndLatin/First1KGreek/zipball/master");
    }

    function handleTar() {
    	window.location.assign("https://github.com/OpenGreekAndLatin/First1KGreek/tarball/master");
    }

    function handleGit() {
    	window.open("https://github.com/OpenGreekAndLatin/First1KGreek");
    }

    function instance$1($$self, $$props, $$invalidate) {
    	const wordCountAll = "23,349,745";
    	const nodeCountAll = "227,676";
    	let rows = [];

    	onMount(async () => {
    		const res = await fetch(`http://localhost:5000/build/catalog.json`);
    		$$invalidate(2, rows = await res.json());
    	});

    	const columns = [
    		{
    			key: "group_name",
    			title: "Workgroup",
    			value: v => v.group_name,
    			sortable: true
    		},
    		{
    			key: "work_name",
    			title: "Work",
    			value: v => v.work_name,
    			sortable: true
    		},
    		{
    			key: "language",
    			title: "Language",
    			value: v => v.language,
    			sortable: false
    		},
    		{
    			key: "scaife",
    			title: "Read",
    			value: v => v.scaife,
    			sortable: false,
    			headerClass: "text-left"
    		},
    		{
    			key: "wordcount",
    			title: "Words",
    			value: v => v.wordcount,
    			sortable: true,
    			headerClass: "text-left"
    		},
    		{
    			key: "urn",
    			title: "URN",
    			value: v => v.urn,
    			sortable: true,
    			headerClass: "text-left"
    		}
    	];

    	
    	
    	
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	$$self.$capture_state = () => ({
    		SvelteTable,
    		onMount,
    		wordCountAll,
    		nodeCountAll,
    		rows,
    		columns,
    		handleZip,
    		handleTar,
    		handleGit
    	});

    	$$self.$inject_state = $$props => {
    		if ("rows" in $$props) $$invalidate(2, rows = $$props.rows);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [wordCountAll, nodeCountAll, rows, columns];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { wordCountAll: 0, nodeCountAll: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get wordCountAll() {
    		return this.$$.ctx[0];
    	}

    	set wordCountAll(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get nodeCountAll() {
    		return this.$$.ctx[1];
    	}

    	set nodeCountAll(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
