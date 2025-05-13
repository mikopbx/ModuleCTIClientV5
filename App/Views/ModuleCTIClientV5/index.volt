<form class="ui large grey segment form disability" id="module-cti-client-form">
    <input type="hidden" name="dirrty" id="dirrty"/>
    <div class="ui grey top right attached label" id="status"><i
                class="spinner loading icon"></i>{{ t._("mod_cti_UpdateStatus") }}</div>
    {# top menu #}
    <div class="ui top attached tabular menu" id="module-cti-client-tabs">
        <a class="item active" data-tab="settings">{{ t._('mod_cti_tab_Settings') }}</a>
        <a class="item" data-tab="debug">{{ t._('mod_cti_tab_debug') }}</a>
    </div>

    {# general tab #}
    <div class="ui bottom attached tab segment active" data-tab="settings">
        <div class="field">
            <div class="ui segment">
                <div class="ui toggle checkbox " id="setup-caller-id-toggle">
                    {{ form.render('setup_caller_id') }}
                    <label for="setup_caller_id">{{ t._('mod_cti_EnableSetCallerID') }}</label>
                </div>
            </div>
        </div>
        <div class="field" id="transliterate-caller-id-toggle-block">
            <div class="ui segment">
                <div class="ui toggle checkbox " id="transliterate-caller-id-toggle">
                    {{ form.render('transliterate_caller_id') }}
                    <label for="transliterate_caller_id">{{ t._('mod_cti_TransliterateCallerID') }}</label>
                </div>
            </div>
        </div>
    </div>

    {# debug tab #}
    <div class="ui bottom attached tab segment" data-tab="debug">
        <span id="debug-info"></span>
    </div>

    {# submit button #}
    {{ partial("partials/submitbutton",['indexurl':'pbx-extension-modules/index/']) }}
</form>