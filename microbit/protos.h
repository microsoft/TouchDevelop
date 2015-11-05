bool           action::is_invalid            (Action a);                             // F1
RefAction*     action::mk                    (int reflen, int totallen, int startptr); // F3 bvm
void           action::run                   (RefAction *a);                         // P1 bvm
int            bits::and_uint32              (int x, int y);                         // F2
int            bits::or_uint32               (int x, int y);                         // F2
int            bits::rotate_left_uint32      (int x, int y);                         // F2
int            bits::rotate_right_uint32     (int x, int y);                         // F2
int            bits::shift_left_uint32       (int x, int y);                         // F2
int            bits::shift_right_uint32      (int x, int y);                         // F2
int            bits::xor_uint32              (int x, int y);                         // F2
uint32_t*      bitvm::allocate               (uint16_t sz);                          // F1
uint32_t       bitvm::const3                 ();                                     // F0
void           bitvm::debugMemLeaks          ();                                     // P0
void           bitvm::decr                   (uint32_t e);                           // P1
void           bitvm::error                  (ERROR code, int subcode = 0);          // P2
void           bitvm::exec_binary            (uint16_t *pc);                         // P1
void           bitvm::incr                   (uint32_t e);                           // P1
uint32_t       bitvm::is_invalid             (uint32_t v);                           // F1
uint32_t       bitvm::ldfld                  (RefRecord *r, int idx);                // F2
uint32_t       bitvm::ldfldRef               (RefRecord *r, int idx);                // F2
uint32_t       bitvm::ldglb                  (int idx);                              // F1
uint32_t       bitvm::ldglbRef               (int idx);                              // F1
uint32_t       bitvm::ldloc                  (RefLocal *r);                          // F1
uint32_t       bitvm::ldlocRef               (RefRefLocal *r);                       // F1
RefLocal*      bitvm::mkloc                  ();                                     // F0
RefRefLocal*   bitvm::mklocRef               ();                                     // F0
RefAction*     bitvm::stclo                  (RefAction *a, int idx, uint32_t v);    // F3
void           bitvm::stfld                  (RefRecord *r, int idx, uint32_t val);  // P3
void           bitvm::stfldRef               (RefRecord *r, int idx, uint32_t val);  // P3
void           bitvm::stglb                  (uint32_t v, int idx);                  // P2
void           bitvm::stglbRef               (uint32_t v, int idx);                  // P2
void           bitvm::stloc                  (RefLocal *r, uint32_t v);              // P2
void           bitvm::stlocRef               (RefRefLocal *r, uint32_t v);           // P2
uint32_t       bitvm::stringLiteral          (int id, uint32_t off);                 // F2
bool           boolean::and_                 (bool x, bool y);                       // F2
bool           boolean::equals               (bool x, bool y);                       // F2
bool           boolean::not_                 (bool x);                               // F1
bool           boolean::or_                  (bool x, bool y);                       // F2
RefString*     boolean::to_string            (int v);                                // F1 over
void           collection::add               (RefCollection *c, int x);              // P2 bvm
int            collection::at                (RefCollection *c, int x);              // F2 bvm
int            collection::count             (RefCollection *c);                     // F1 bvm
int            collection::index_of          (RefCollection *c, uint32_t x, int start); // F3 bvm
RefCollection* collection::mk                ();                                     // F0 bvm
int            collection::remove            (RefCollection *c, int x);              // F2 bvm
void           collection::remove_at         (RefCollection *c, int x);              // P2 bvm
void           collection::set_at            (RefCollection *c, int x, int y);       // P3 bvm
void           contract::assert              (int cond, uint32_t msg);               // P2 bvm
void           ds1307::adjust                (user_types::DateTime d);               // P1
uint8_t        ds1307::bcd2bin               (uint8_t val);                          // F1
uint8_t        ds1307::bin2bcd               (uint8_t val);                          // F1
int            math::abs                     (int x);                                // F1
int            math::clamp                   (int l, int h, int x);                  // F3
int            math::max                     (int x, int y);                         // F2
int            math::min                     (int x, int y);                         // F2
int            math::mod                     (int x, int y);                         // F2
int            math::pow                     (int x, int n);                         // F2
int            math::random                  (int max);                              // F1
int            math::sign                    (int x);                                // F1
int            math::sqrt                    (int x);                                // F1
int            micro_bit::analogReadPin      (MicroBitPin& p);                       // F1
void           micro_bit::analogWritePin     (MicroBitPin& p, int value);            // P2
void           micro_bit::callback           (MicroBitEvent e, Action a);            // P2 over
void           micro_bit::clearImage         (RefImage *i);                          // P1 over
void           micro_bit::clearScreen        ();                                     // P0
void           micro_bit::compassCalibrateEnd ();                                     // P0 over
void           micro_bit::compassCalibrateStart ();                                     // P0 over
int            micro_bit::compassHeading     ();                                     // F0
RefImage*      micro_bit::createImage        (int w, int h, uint32_t bitmap);        // F3 over
RefImage*      micro_bit::createImageFromString (RefString *s);                         // F1 over
int            micro_bit::digitalReadPin     (MicroBitPin& p);                       // F1
void           micro_bit::digitalWritePin    (MicroBitPin& p, int value);            // P2
RefImage*      micro_bit::displayScreenShot  ();                                     // F0 over
void           micro_bit::displayStopAnimation ();                                     // P0 over
void           micro_bit::enablePitch        (MicroBitPin& p);                       // P1
void           micro_bit::events::alert      (int event);                            // P1
void           micro_bit::events::audio_recorder (int event);                            // P1
void           micro_bit::events::camera     (int event);                            // P1
void           micro_bit::events::remote_control (int event);                            // P1
void           micro_bit::fiberDone          (void *a);                              // P1 over
void           micro_bit::fiberHelper        (void *a);                              // P1 over
void           micro_bit::forever            (Action a);                             // P1 over
void           micro_bit::forever_stub       (void *a);                              // P1 over
void           micro_bit::generate_event     (int id, int event);                    // P2
int            micro_bit::getAcceleration    (int dimension);                        // F1
int            micro_bit::getBrightness      ();                                     // F0
int            micro_bit::getCurrentTime     ();                                     // F0
int            micro_bit::getImagePixel      (RefImage *i, int x, int y);            // F3 over
int            micro_bit::getImageWidth      (RefImage *i);                          // F1 over
int            micro_bit::i2c_read           (int addr);                             // F1
void           micro_bit::i2c_write          (int addr, char c);                     // P2
void           micro_bit::i2c_write2         (int addr, int c1, int c2);             // P3
MicroBitPin*   micro_bit::ioP0               ();                                     // F0 over
MicroBitPin*   micro_bit::ioP1               ();                                     // F0 over
MicroBitPin*   micro_bit::ioP10              ();                                     // F0 over
MicroBitPin*   micro_bit::ioP11              ();                                     // F0 over
MicroBitPin*   micro_bit::ioP12              ();                                     // F0 over
MicroBitPin*   micro_bit::ioP13              ();                                     // F0 over
MicroBitPin*   micro_bit::ioP14              ();                                     // F0 over
MicroBitPin*   micro_bit::ioP15              ();                                     // F0 over
MicroBitPin*   micro_bit::ioP16              ();                                     // F0 over
MicroBitPin*   micro_bit::ioP19              ();                                     // F0 over
MicroBitPin*   micro_bit::ioP2               ();                                     // F0 over
MicroBitPin*   micro_bit::ioP20              ();                                     // F0 over
MicroBitPin*   micro_bit::ioP3               ();                                     // F0 over
MicroBitPin*   micro_bit::ioP4               ();                                     // F0 over
MicroBitPin*   micro_bit::ioP5               ();                                     // F0 over
MicroBitPin*   micro_bit::ioP6               ();                                     // F0 over
MicroBitPin*   micro_bit::ioP7               ();                                     // F0 over
MicroBitPin*   micro_bit::ioP8               ();                                     // F0 over
MicroBitPin*   micro_bit::ioP9               ();                                     // F0 over
bool           micro_bit::isButtonPressed    (int button);                           // F1
bool           micro_bit::isPinTouched       (MicroBitPin& pin);                     // F1
void           micro_bit::onButtonPressed    (int button, Action a);                 // P2 over
void           micro_bit::onButtonPressedExt (int button, int event, Action a);      // P3 over
void           micro_bit::onPinPressed       (int pin, Action a);                    // P2 over
void           micro_bit::on_calibrate_required (MicroBitEvent e);                      // P1
void           micro_bit::panic              (int code);                             // P1 over
void           micro_bit::pause              (int ms);                               // P1
void           micro_bit::pitch              (int freq, int ms);                     // P2
void           micro_bit::plot               (int x, int y);                         // P2
void           micro_bit::plotImage          (RefImage *i, int offset);              // P2 over
void           micro_bit::plotLeds           (int w, int h, uint32_t bitmap);        // P3 over
bool           micro_bit::point              (int x, int y);                         // F2
void           micro_bit::reset              ();                                     // P0 over
void           micro_bit::runInBackground    (Action a);                             // P1 over
void           micro_bit::scrollImage        (RefImage *i, int offset, int delay);   // P3 over
void           micro_bit::scrollNumber       (int n, int delay);                     // P2
void           micro_bit::scrollString       (RefString *s, int delay);              // P2 over
void           micro_bit::serialReadDisplayState ();                                     // P0 over
RefImage*      micro_bit::serialReadImage    (int width, int height);                // F2 over
RefString*     micro_bit::serialReadString   ();                                     // F0 over
void           micro_bit::serialSendDisplayState ();                                     // P0 over
void           micro_bit::serialSendImage    (RefImage *img);                        // P1 over
void           micro_bit::serialSendString   (RefString *s);                         // P1 over
void           micro_bit::setAnalogPeriodUs  (MicroBitPin& p, int value);            // P2
void           micro_bit::setBrightness      (int percentage);                       // P1
void           micro_bit::setImagePixel      (RefImage *i, int x, int y, int value); // P4 over
void           micro_bit::showAnimation      (int w, int h, uint32_t bitmap, int ms); // P4 over
void           micro_bit::showDigit          (int n);                                // P1
void           micro_bit::showImage          (RefImage *i, int offset);              // P2 over
void           micro_bit::showLeds           (int w, int h, uint32_t bitmap, int delay); // P4 over
void           micro_bit::showLetter         (RefString *s);                         // P1 over
int            micro_bit::thermometerGetTemperature ();                                     // F0 over
void           micro_bit::unPlot             (int x, int y);                         // P2
int            number::add                   (int x, int y);                         // F2
int            number::divide                (int x, int y);                         // F2
bool           number::eq                    (int x, int y);                         // F2
bool           number::ge                    (int x, int y);                         // F2
bool           number::gt                    (int x, int y);                         // F2
bool           number::le                    (int x, int y);                         // F2
bool           number::lt                    (int x, int y);                         // F2
int            number::multiply              (int x, int y);                         // F2
bool           number::neq                   (int x, int y);                         // F2
void           number::post_to_wall          (int n);                                // P1 over
int            number::subtract              (int x, int y);                         // F2
RefString*     number::to_character          (int x);                                // F1 over
RefString*     number::to_string             (int x);                                // F1 over
RefRecord*     record::mk                    (int reflen, int totallen);             // F2 bvm
void           refcollection::add            (RefRefCollection *c, RefObject *x);    // P2 bvm
RefObject*     refcollection::at             (RefRefCollection *c, int x);           // F2 bvm
int            refcollection::count          (RefRefCollection *c);                  // F1 bvm
int            refcollection::index_of       (RefRefCollection *c, RefObject *x, int start); // F3 bvm
RefRefCollection* refcollection::mk             ();                                     // F0 bvm
int            refcollection::remove         (RefRefCollection *c, RefObject *x);    // F2 bvm
void           refcollection::remove_at      (RefRefCollection *c, int x);           // P2 bvm
void           refcollection::set_at         (RefRefCollection *c, int x, RefObject *y); // P3 bvm
ManagedString  string::_                     (ManagedString s1, ManagedString s2);   // F2
RefString*     string::at                    (RefString *s, int i);                  // F2 bvm
int            string::code_at               (RefString *s, int i);                  // F2 bvm
RefString*     string::concat                (RefString *s1, RefString *s2);         // F2 bvm
RefString*     string::concat_op             (RefString *s1, RefString *s2);         // F2 bvm
int            string::count                 (RefString *s);                         // F1 bvm
bool           string::equals                (RefString *s1, RefString *s2);         // F2 bvm
RefString*     string::fromLiteral           (const char *p);                        // F1 bvm
RefString*     string::mkEmpty               ();                                     // F0 bvm
void           string::post_to_wall          (RefString *s);                         // P1 bvm
RefString*     string::substring             (RefString *s, int i, int j);           // F3 bvm
int            string::to_character_code     (RefString *s);                         // F1 bvm
int            string::to_number             (RefString *s);                         // F1 bvm
void           touch_develop::internal_main  ();                                     // P0
ManagedString  touch_develop::mk_string      (char* c);                              // F1
